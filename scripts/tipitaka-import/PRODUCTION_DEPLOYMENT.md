# Tipitakaデータの本番環境への投入方法

このドキュメントでは、Tipitakaデータを本番のTurso（libSQL）DBへ一括投入し、Cloudflare Workers KVの表示用Read Modelを更新する手順を説明します。
インポートはデプロイ処理やHTTPリクエストから実行せず、データ投入を行うオペレーターの環境から明示的に実行してください。

## 概要

本番DBをSQLiteファイルへexportし、そのローカルコピーへTipitakaデータを投入します。
検証済みファイルを`turso db import`で新しいDBとして一括uploadし、WorkerとGitHub Actionsの接続先を切り替えます。
旧DBはロールバック用に残します。本番Tursoへページやセグメントを逐次INSERTしてはいけません。

## 実行前の確認

1. Turso CLIとWranglerへログインしていること。
2. `tipitaka-md*`ディレクトリと`books.json`が存在すること。
3. export元の本番DB名と、重複しない新DB名を確定していること。
4. DBファイルと作業領域を保存できる空き容量があること。
5. 切替前にユーザー、翻訳、投票、セッションなどの更新を比較できること。

## 実行手順

作業ディレクトリを作り、本番DBをSQLiteへexportします。

```bash
stage_dir=$(mktemp -d /tmp/digital-buddhism-import.XXXXXX)
source_db=current-production-db
target_db=next-production-db
turso db export "$source_db" --output-file "$stage_dir/$target_db.db"
```

exportされたWALを反映し、ローカルSQLiteへmigrationとTipitakaインポートを適用します。

```bash
nix develop --command sqlite3 "$stage_dir/$target_db.db" "PRAGMA wal_checkpoint(TRUNCATE)"
export TURSO_DATABASE_URL="file:$stage_dir/$target_db.db"
unset TURSO_AUTH_TOKEN
nix develop --command bun scripts/turso-migrations.ts
nix develop --command bun scripts/tipitaka-import.ts --skip-read-model
```

`tipitaka-import.ts`は`file:`またはloopback HTTP以外のDBを拒否します。
`--skip-read-model`はDB更新後のローカルKV生成を省略します。

SQLiteの整合性、ページ・翻訳・注釈リンク件数、未解決段落グループを検査します。
export後に本番DBのユーザーデータが更新されていないことも、切替直前に比較します。
差分があれば切り替えず、最新exportからやり直します。

検証済みSQLiteを新しいTurso DBとして一括importします。

```bash
turso db import "$stage_dir/$target_db.db" --group default
```

新DBを検査した後、ローカルSQLiteから本番KVを一括生成します。

```bash
nix develop --command bun scripts/tipitaka-read-model.ts --remote
```

export後の本番DBとの差分がないことを再確認してから、`TURSO_DATABASE_URL`と`TURSO_AUTH_TOKEN`をCloudflareでは同一のsecret bulk操作で、GitHub Actionsでも同じ新DBへ切り替えます。値を標準出力、ログ、Gitへ残してはいけません。旧DBはロールバック確認が終わるまで削除しません。

Cloudflare Workersのビルド・デプロイやリクエスト処理に全量インポートを含めないでください。
大量データの投入とRead Modelの全量生成は長時間処理になるため、オペレーターの環境から独立した作業として実行します。

## 実行時間とパフォーマンス

- **処理時間**: ファイル数により異なります。数百〜数千ファイルでは長時間かかる
  可能性があります
- **並列処理**: ローカルSQLiteへのインポートは最大10ファイルずつ並列処理します
- **ログ**: 進捗が標準出力へ記録されます

## 実行記録

インポートを開始すると`import_runs`へ`RUNNING`の行を作成し、正常終了時は
`COMPLETED`、エラー終了時は`FAILED`と終了時刻・エラーメッセージを記録します。

`books.json`と各Markdownファイルは`import_files`へ相対パス、SHA-256 checksum、
処理状態、開始・終了時刻を記録します。
読み取れなかったファイルはchecksumを`NULL`として`FAILED`を記録します。
各Tipitaka文書の`import_file_id`は、最後に正常処理した入力ファイルを参照します。

プロセスを強制終了した場合は`RUNNING`または`PENDING`が残ります。
これは完了扱いにせず、原因を確認して新しいインポートを実行してください。

## 冪等性の保証

スクリプトは以下の仕組みで冪等性を保証します。

1. **ページのupsert**: `upsertPageAndSegments` がslugを基準に既存ページを確認し、
   存在すれば更新、なければ作成します
2. **セグメントの同期**: 既存セグメントを更新し、不要なセグメントを削除します
3. **セグメントタイプ・メタデータタイプ**: 既存のものは再作成しません

## トラブルシューティング


### エラー: `TURSO_DATABASE_URL is not defined`

`TURSO_DATABASE_URL` が実行環境へ渡っていません。接続URLをシェルへ直接書く
のではなく、利用しているシークレット管理機能から読み込んでください。

### リモートDBが拒否される

Tipitakaインポータは本番Tursoへの逐次書き込みを許可しません。
`TURSO_DATABASE_URL`を検証対象のローカルSQLiteファイルへ向けてください。

### 処理が途中で止まった

冪等性があるため、原因を確認してからローカルSQLiteに対して同じコマンドを再実行できます。すでに反映されたページは更新され、未処理のページは追加されます。
DBの`import_runs`と`import_files`を確認すると、失敗した実行と入力ファイルを
特定できます。

## 翻訳更新の反映

翻訳の正本はTurso DBです。
翻訳本文、採用翻訳、翻訳ジョブ、選択語義セット、選択語義の内容・得票の変更をSQLite triggerが`tipitaka_read_model_jobs`へupsertします。
Workerは変更リクエストの完了後と1分間隔のcronで未処理ジョブを読み、対象ページ・言語の翻訳overlay、翻訳完了状態、トップ目次の翻訳overlayをKVへ再生成します。
overlay本体を書き込んだ後にversion pointerを切り替えるため、生成途中のデータは表示されません。
新versionがKVの参照地点へ未伝播の場合は、一つ前のversionへフォールバックします。
公開ページのedge cacheは60秒、stale-while-revalidateは60秒です。

## データ更新時の対応

Tipitakaデータが更新された場合は、次の順で対応します。

1. 更新されたMarkdownファイルを配置する
2. 本番DBを新しいローカルSQLiteへexportする
3. ローカルSQLiteへmigrationとTipitakaインポートを適用する
4. SQLiteを新しいTurso DBへ一括importする
5. Read Modelを本番KVへ一括投入する
6. 本番DBとの差分がないことを再確認して接続先を切り替える
7. 主要ページ、件数、翻訳、注釈表示を確認する

## 注意事項

- 初回投入前に、Turso側の容量・利用制限・バックアップ方針を確認してください
- 実行中はプロセスを終了させないでください。長時間処理ではログを保存します
- Tipitakaインポータの接続先にはローカルの`file:` SQLite URLを使います
- CI、ビルド、Workerのリクエスト処理へ大量データ投入を組み込まないでください
- 作業用SQLiteとログに認証トークンを保存しないでください

## Read Model v2への切替（2026-09-05）

v2は`tipitaka/v2/`へ保存し、ページoverlayに選択語義と得票を含めます。
記事の子孫別翻訳取得を廃止し、home overlayから題名を適用します。

1. `0016_gloss_read_model`までのmigrationを適用します。
2. 翻訳・語義・投票を保持した最新の本番DBコピーから、上記の全量生成コマンドで
   v2のKVを生成します。新コードを先に公開すると、v2未生成ページは404になります。
3. export後の更新差分がないこととKV生成完了を確認してから、v2を読むWorkerへ
   切り替えます。差分があれば最新コピーから再生成します。
4. 題名、語義、ログイン後の投票状態、語義変更の再投影を確認します。

DBインポートを伴わないコード更新でも、v2の全量生成が必要です。
空の開発DBや投稿データを欠くコピーから本番KVを生成しないでください。
v1のKVは切替時に削除せず、旧Workerへ戻せる状態を保ちます。
