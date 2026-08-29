# DB の初期化

このリポジトリのローカル開発・テストでは、コマンドごとに一時SQLite DBを
作成します。`db:with-branch` がTurso用のチェックイン済みマイグレーションを
適用し、コマンド終了後にDBを破棄します。そのため、開発DBを手動でリセット
したり、Docker/PostgreSQLを起動したりする必要はありません。

```bash
bun run dev
```

新しいDBで起動したい場合は、開発サーバーを停止して再起動してください。
テストもテストファイルごとに独立した一時SQLite DBを使用します。

## 明示的なローカルSQLiteファイルをリセットする場合

一時DBではなく、手元で用意した `file:` URLのSQLite DBだけをリセットできます。
スキーマを再作成する操作ではないため、先にTurso用マイグレーションを適用して
ください。

```bash
TURSO_DATABASE_URL=file:///absolute/path/to/database.sqlite \
  bash scripts/reset-db.sh
```

このスクリプトへ `libsql://` の本番URLを渡さないでください。共有・本番DBを
消去する操作はこの手順の対象外です。

## 本番Tursoのマイグレーション

本番DBの変更は、接続情報を安全な方法で環境変数へ読み込んだうえで、明示的に
実行します。

```bash
bun run db:prod:migrate
```

必要な環境変数は `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` です。値はGitへ
コミットせず、デプロイ先またはローカルのシークレット管理機能から渡します。
