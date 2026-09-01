# アーキテクチャ概要

Digital Buddhism は、Tipiṭakaの原文・翻訳・注釈を配信するCloudflare Workerです。
このドキュメントは、全体像と主要な責務を短く確認するための入口です。

## 技術スタック（現行）

- フレームワーク: TanStack Start（TanStack Router + Vite）
- 配信: Cloudflare Workers
- 言語: TypeScript
- UI: React 19 + Tailwind CSS + Radix UI 系コンポーネント
- i18n: use-intl
- DB: Turso（libSQL / SQLite）
- DB アクセス: Kysely（ランタイム）+ Drizzle（スキーマ/マイグレーション）
- 認証: better-auth（SQLite 用DB設定）

## リポジトリ構成（要約）

```
/
├── src/
│   ├── routes/              # TanStack Start のルート境界
│   ├── app/                 # 画面・機能の実装
│   ├── components/          # 共有 UI
│   ├── db/                  # Kysely 接続・型・ローカルSQLiteヘルパー
│   ├── drizzle/             # SQLite/Turso のスキーマとマイグレーション
│   ├── i18n/                # i18n 設定
│   ├── lib/                 # 汎用ユーティリティ（業務ロジック禁止）
│   └── utils/               # 共有ユーティリティ
├── docs/                    # 設計・仕様・運用ドキュメント
└── ...
```

詳細な配置ルールは `docs/architecture/conventions/route-colocation.md` を
参照してください。

## ルート（`src/routes`）

- TanStack Router のファイルベースルートを定義する
- `$locale` などの動的セグメントと、`_common` などのパスレスレイアウトを
  ファイル名で表現する
- ページの取得・更新は route loader、server function、API route の境界から
  機能モジュールを呼び出す
- ルートツリー生成物は手動編集しない

機能固有のUIや処理は `src/app` に置き、ルートファイルは入出力と境界の定義に
集中させます。

## 共有UI（`src/components`）

複数ルートから参照されるUIを集約します。1つのルートだけで使うUIとその処理は
`src/app` の該当機能スコープに置きます。

## DB レイヤー

- `src/db`: Kysely の接続、DB型、SQLite向けの値変換、テスト用DBヘルパー
- `src/drizzle`: スキーマとTurso用マイグレーション
- ランタイムのDB接続は `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` から作る
- ローカル開発は、Nix管理の`sqld`を`http://127.0.0.1:18080`で起動し、
  `.data/digital-buddshim.sqld`をDB・import・read model・ローカルWorker間で共有する
- テストはテスト単位の一時`file:` SQLite DBを使う
- 本番はTursoの共有DBを使い、ローカルテストやCIから本番DBへ接続しない
- ローカルWorkerはCloudflare Vite pluginのローカルruntimeで動かし、KV・Queue・
  Images・R2は`wrangler.jsonc`と同じbinding名・APIを使う

取得・更新ロジックは、利用するルートに近い `_db` または `db` 配下に置きます。
DB層は接続とデータの取得・更新に集中し、業務判断はdomain/service層で行います。

## 認証

`src/auth.ts` が better-auth のエントリポイントです。認証関連のDBアクセスも
現在のリクエストのTurso接続を通じて実行します。

## i18n

`src/i18n` に設定を集約し、`src/routes/$locale` を多言語ルートの基点にします。

## 代表的なデータの流れ

1. TanStack Router のルートがリクエストを受ける
2. loader、server function、またはAPI routeが機能のservice/domain/dbを呼ぶ
3. DBから取得した値をルート境界へ返す
4. Reactコンポーネントが画面を描画する

ユーザー操作が必要な箇所だけClient Componentを使用し、環境依存の接続や外部
サービス呼び出しはserver側の境界に閉じ込めます。

## 依存方向（要約）

- `service` → `domain` / `db` / `utils`
- `domain` → `utils`（`db` へ直接依存しない）
- `components` → `service` / `domain` / `db` / `utils`
- `routes` → `app` の機能モジュール

詳細な配置・依存ルールは `docs/architecture/conventions/route-colocation.md` を
参照してください。
