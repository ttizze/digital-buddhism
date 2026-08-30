# Tipitakaデータの本番環境への投入方法

このドキュメントでは、Tipitakaデータを本番のTurso（libSQL）DBへ投入し、Cloudflare Workers KVの表示用Read Modelを更新する手順を説明します。
インポートはデプロイ処理やHTTPリクエストから実行せず、データ投入を行うオペレーターの環境から明示的に実行してください。

## 概要

Tipitakaインポートスクリプトは冪等性を持ちます。
同じスクリプトを複数回実行しても、既存ページは更新され、新しいデータだけが追加されます。
DBへの投入が完了すると、本文・目次・翻訳・注釈の表示用Read Modelを再生成します。

## 実行前の確認

1. **Tursoのマイグレーション**: 本番DBへ最新のSQLite/Tursoマイグレーションを
   適用します。

   ```bash
   bun run db:prod:migrate
   ```

   このコマンドはDrizzleのmigration journalを読み、未適用のmigrationを一件ずつ
   Tursoのmigration transactionで適用します。
   各migrationとjournal更新は同じtransactionで確定するため、失敗時は最後に
   完了したmigrationから再開します。

2. **接続情報**: 実行環境に次の環境変数を安全に設定します。
   - `TURSO_DATABASE_URL`（本番Tursoの接続URL）
   - `TURSO_AUTH_TOKEN`（本番Tursoの認証トークン）

   これらの値はGit、ログ、ドキュメントへ保存しません。

3. **Cloudflareの権限**: Wranglerが対象アカウントへログイン済みであり、`wrangler.jsonc`の`TIPITAKA_READ_MODELS` bindingへ書き込めることを確認します。

4. **Tipitakaファイル**: `tipitaka-md*` ディレクトリと `books.json` が存在することを確認します。

マイグレーションは、投入対象と同じTurso環境を指していることを確認してから実行してください。
ローカルの一時SQLite DBやCIから本番DBへ接続してはいけません。

## 実行手順

プロジェクトのNix開発環境内で、接続情報を読み込んだ状態で実行します。

```bash
bun scripts/tipitaka-import.ts --remote-read-model
```

`bun run tipitaka` はローカルの `.env` とローカルKVを使う開発用ショートカットです。
本番投入では、誤った接続先へ書き込むことを避けるため、上記のコマンドでTurso接続先と`--remote-read-model`を明示してください。

Cloudflare Workersのビルド・デプロイやリクエスト処理に全量インポートを含めないでください。
大量データの投入とRead Modelの全量生成は長時間処理になるため、オペレーターの環境から独立した作業として実行します。

## 実行時間とパフォーマンス

- **処理時間**: ファイル数により異なります。数百〜数千ファイルでは長時間かかる
  可能性があります
- **並列処理**: インポート処理は最大10ファイルずつ並列処理します
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

### Tursoの認証に失敗する

`TURSO_AUTH_TOKEN` の対象DB・権限・有効期限を確認してください。トークンを
ログやエラーメッセージへ出力しないでください。

### 処理が途中で止まった

冪等性があるため、原因を確認してから同じコマンドを再実行できます。すでに
反映されたページは更新され、未処理のページは追加されます。
DBの`import_runs`と`import_files`を確認すると、失敗した実行と入力ファイルを
特定できます。

## 翻訳更新の反映

翻訳の正本はTurso DBです。
翻訳本文、採用翻訳、翻訳ジョブの変更をSQLite triggerが`tipitaka_read_model_jobs`へupsertします。
Workerは変更リクエストの完了後と1分間隔のcronで未処理ジョブを読み、対象ページ・言語の翻訳overlay、翻訳完了状態、トップ目次の翻訳overlayをKVへ再生成します。
overlay本体を書き込んだ後にversion pointerを切り替えるため、生成途中のデータは表示されません。
新versionがKVの参照地点へ未伝播の場合は、一つ前のversionへフォールバックします。
公開ページのedge cacheは60秒、stale-while-revalidateは60秒です。

## データ更新時の対応

Tipitakaデータが更新された場合は、次の順で対応します。

1. 更新されたMarkdownファイルを配置する
2. 本番Turso DBのマイグレーションが最新であることを確認する
3. `--remote-read-model`を指定して同じインポートスクリプトを再実行する
4. 主要ページ、件数、KV経由の本文・翻訳・注釈表示を確認する

## 注意事項

- 初回投入前に、Turso側の容量・利用制限・バックアップ方針を確認してください
- 実行中はプロセスを終了させないでください。長時間処理ではログを保存します
- 本番URLの代わりにローカルの `file:` SQLite URLを使うと、本番には反映されません
- CI、ビルド、Workerのリクエスト処理へ大量データ投入を組み込まないでください

```bash
bun scripts/tipitaka-import.ts --remote-read-model 2>&1 | tee tipitaka-import-$(date +%Y%m%d-%H%M%S).log
```

ログファイルに接続情報やトークンが含まれていないことを確認し、共有リポジトリ
へ追加しないでください。
