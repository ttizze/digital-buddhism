# DB の初期化

ローカル開発では、`.data/digital-buddshim.sqld`をDB・import・read model・
workerd/Miniflare間で共有します。`db:with-local`がNix管理の`sqld`を起動し、
Turso用のチェックイン済みマイグレーションを適用してから各コマンドを
起動します。Docker/PostgreSQLは不要です。

```bash
bun run dev
```

ローカルDBを空のmigration済み状態へ戻す場合は、開発サーバーを停止してから
次を実行します。

```bash
bun run db:reset
```

テストは開発DBを共有せず、テストファイルごとに独立した一時SQLite DBを
使用します。

`db:reset`は管理対象のloopback libSQLだけをリセットします。`file:` URLや
`libsql://`の共有・本番URLは`db:with-local`が拒否します。

## 本番Tursoのマイグレーション

本番DBの変更は、接続情報を安全な方法で環境変数へ読み込んだうえで、明示的に
実行します。

同じTurso URLを設定したシェルでmigrationを実行します。

```bash
bun run db:prod:migrate
```

必要な環境変数は `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` です。値はGitへ
コミットせず、デプロイ先またはローカルのシークレット管理機能から渡します。
