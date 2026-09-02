# ルート内コロケーション規約

このドキュメントは、TanStack Start のルート境界と機能実装の配置ルールを定めます。
ルートの入出力と機能の責務を分けつつ、関連するコードを近くに保ちます。

## 基本方針

- `src/routes` にはTanStack Routerのルート境界を置く
- ルート固有の機能実装は `src/app` の該当ルート・機能スコープに置く
- ルートファイルはloader、server function、APIの入出力と境界に集中させる
- ルートツリー生成物は手動編集しない
- コンポーネント専用ロジックはそのコンポーネント配下へ置く

TanStack Routerでは、ファイル名の `$` が動的セグメント、先頭の `_` がパスレス
レイアウトを表します。例えば `$locale._common.$handle_.$pageSlug.tsx` は、
`locale`・`handle`・`pageSlug` をURLに持ち、`_common` 自体はURLに含めません。
ルートにしない隣接ファイルは先頭に `-` を付けます（例: `-index-data.ts`）。

## ディレクトリ構造（例）

```
src/routes/$locale._common.$handle_.$pageSlug.tsx  # ルート境界
src/routes/$locale/-page-detail-data.ts             # ルート用データ取得
src/app/[locale]/(common-layout)/[handle]/[pageSlug]/
  _components/                                      # ルート専用UI
  _db/                                               # ルート専用DBアクセス
  _domain/                                           # ルート専用ドメイン
  _service/                                          # ルート専用サービス
  _utils/                                            # ルート専用の純粋ヘルパー
```

## 各レイヤーの役割

### `service/`

- ユースケースのフローを定義する
- `domain/` と `db/` を組み合わせて副作用をオーケストレーションする
- 基本は「1サービス = 1ファイル」。複雑な場合のみサブフォルダ化する

### `domain/`

- 純粋な業務ロジックを置く
- I/Oへ直接依存しない
- 複数サービスで共有する場合は、機能の共通スコープへ移す

### `db/`

- KyselyによるDBアクセスを置く
- サービス層から呼び出す
- ルート全体で使う場合は `_db/` に置く

### `utils/`

- I/Oを持たない汎用ヘルパーを置く
- 業務上の意味を持つ処理は `domain/` に置く

## 配置ルール

- **ルート境界**: `src/routes` のTanStack Startルートファイル
- **ルート用補助**: ルートと同じスコープの先頭 `-` ファイル、または `src/app` の
  近接する機能ディレクトリ
- **ルート内共有**: `_components/`, `_db/`, `_domain/`, `_service/`, `_utils/`
- **コンポーネント配下**: `service/`, `domain/`, `db/`, `utils/`, `hooks/`

## 依存方向

- `service` → `domain` / `db` / `utils` ✅
- `domain` → `utils` ✅
- `domain` → `db` ❌（必ずservice経由）
- `utils` → `db` ❌
- `components` → `service` / `domain` / `db` / `utils` ✅
- `routes` → `app` の機能モジュール ✅

## 共有の扱い

- 同一ルート内で複数箇所から使うものは、ルート直下の共通スコープに置く
- APIルートで完結する処理は、そのAPI機能の近くに置く
- 複数ルートで使う処理は、利用箇所の最小共通祖先へ移す
- 1箇所でしか使わない処理は、呼び出し元の隣に置く

## types の配置

- UI/API共有型は使用する境界に最も近い場所へ置く
- ルート専用型はそのルートの機能スコープへ置く

## 禁止事項

- `src/lib` に業務ロジックやユースケースを追加しない
- `domain` から `db` を直接参照しない
- ルート境界へDB判断や複雑な業務ロジックを直書きしない
- ルートツリー生成物を直接編集しない

## テスト方針

- `domain/`: 分岐・境界値・異常系をユニットテストで担保する
- `utils/`: 複雑な変換だけを対象にする
- `db/`: SQLite/Tursoの実装を使う統合テストを、重要な制約とクエリに絞って書く
- `service/`: ハッピーパスと主要な異常系を確認する
- 変更後は `bun run typecheck`、`bun run format:check`、`bun run lint` を実行する
