# Evame

[English README](README.md)

Evame は、ユーザー投稿テキストに翻訳・注釈・解説を付けて共有するためのプロジェクトです。

## 最短で動かす（開発）
以降のプロジェクトツールチェーンコマンドは、すべて `nix develop` 内で実行してください。
対応環境は Apple silicon macOS と aarch64/x86_64 Linux です。Intel Mac は、固定している nixpkgs が `x86_64-darwin` のサポートを終了したため非対応です。

```bash
nix develop
```

1. 依存関係をインストール
   ```bash
   bun install
   ```
2. 環境変数を用意
   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```
   生成した文字列を `.env` に設定してください。
3. 開発サーバーを起動
   ```bash
   bun run dev
   ```
   開発コマンドが、チェックイン済みのTurso用マイグレーションとシードを適用した
   使い捨ての一時SQLite DBを自動作成します。ローカル開発にDocker、
   PostgreSQL、手動のシードは不要です。
4. `http://localhost:3000` を開く

本番環境はTurso（libSQL）を使用します。`TURSO_DATABASE_URL` と
`TURSO_AUTH_TOKEN` はデプロイ先のシークレット管理機能で設定し、値を
リポジトリへコミットしないでください。

## 主要リンク

- ドキュメント入口: `docs/README.md`
- AI 向け前提: `AI_CONTEXT.md`
- AI 運用ルール: `AGENTS.md`

## このリポジトリの構成（要約）

- `src/routes`: TanStack Start のルート
- `src/app`: 移行中の共有実装
- `src/db`: Kysely の接続・DB 型・ローカルSQLiteヘルパー
- `src/drizzle`: SQLite/Turso のスキーマとマイグレーション
- `src/components`: 共有 UI

詳細は `docs/architecture/architecture.md` を参照してください。
