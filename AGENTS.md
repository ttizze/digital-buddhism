# AGENTS.md — AI/コントリビューター向け作業ルール

このリポジトリで作業する際の入口です。詳細は各リンク先を参照してください。

## 必読

- 前提の要約: `AI_CONTEXT.md`
- 開発設計ルール: `docs/architecture/conventions/development-rules.md`
- ルート配置ルール: `docs/architecture/conventions/route-colocation.md`
- テストルール: `docs/architecture/conventions/testing-rules.md`
- サーバーアクション規約: `docs/architecture/conventions/server-actions.md`
- アーキテクチャ: `docs/architecture/architecture.md`
- 要件: `docs/requirements.md`

## 作業ルールの要点

- **最小変更・シンプル優先・過剰分割禁止**（詳細は development-rules.md）
- `useMemo` / `useCallback` は使用しない
- `useEffect` は必要な場合のみ
- 指示がない限り、引数を optional にしない
- DB は **Kysely をランタイムで使用**。**Drizzle はスキーマ/マイグレーション専用**で、ランタイムでは import type のみ許可
- 秘密情報（`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` など）をコードやドキュメントへ書かない

## 変更後の必須チェック

```sh
bun run typecheck
bun run format:check
bun run lint
bun run test   # 関連するテストが通ること
```
