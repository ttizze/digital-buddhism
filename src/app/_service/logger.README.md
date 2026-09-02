# ロギングガイド

このプロジェクトでは、Cloudflare Workers標準の`console` APIを使用した構造化ロギングを実装しています。

## 特徴

- **Worker互換**: Node.js専用のログ依存を持たず、Cloudflare Workersで直接動作
- **構造化ログ**: すべての環境でJSON形式のログを出力
- **ランタイム分離**: WorkerはCloudflare binding、Tipitaka CLIはBunの環境変数を参照
- **Sentry統合**: Worker側ロガーはリクエストコンテキストをSentryへ設定

## 基本的な使い方

### サーバー側（推奨）

```typescript
import { createServerLogger } from "@/app/_service/logger.server";

const logger = createServerLogger("my-service");

// デバッグログ（開発環境のみ）
logger.debug({ userId: "123" }, "User logged in");

// 情報ログ
logger.info({ pageId: 456 }, "Page loaded");

// 警告ログ
logger.warn({ slug: "invalid-page" }, "Page not found");

// エラーログ（Errorのname/message/stackも構造化）
logger.error({ err: error }, "Failed to load page");
```

### クライアント側

通常、クライアント側ではログを出力しません。エラーはSentryが自動的にキャプチャします。

### Tipitaka取込CLI

```typescript
import { createCliLogger } from "../../logger";

const logger = createCliLogger("tipitaka-import");
```

CLIコードからWorker用の`logger.server.ts`をimportしません。Worker用ロガーは
`cloudflare:workers`のbindingに依存し、通常のBunプロセスでは解決できないためです。
WorkerとCLIは環境ごとのログレベルだけを分け、出力処理は`logger-core.ts`で共有します。

## ログレベル

ログレベルは`LOG_LEVEL`で明示的に上書きできます。WorkerはCloudflare binding、
Tipitaka CLIはBunプロセスの環境変数から読みます。

### ログレベルの優先順位

1. **`LOG_LEVEL`**（Worker bindingまたはCLI環境変数）
2. **Workerテスト環境**: `error`
3. **Worker本番環境**: `info`
4. **Worker開発環境**: `debug`
5. **Tipitaka CLI**: `info`（エントリーポイントは未指定時に`debug`を設定）

### 利用可能なログレベル

- `debug`: すべてのログを出力（開発環境のデフォルト）
- `info`: 情報レベル以上を出力（本番環境のデフォルト）
- `warn`: 警告以上を出力
- `error`: エラーのみ出力（テスト環境のデフォルト）

### 環境別のデフォルト設定

| 環境 | デフォルトレベル | 検知方法 | 理由 |
|------|-----------------|----------|------|
| Workerテスト | `error` | `import.meta.env.MODE` | テスト結果を見やすくする |
| Worker本番 | `info` | `import.meta.env.PROD` | エラー、警告、重要なビジネスイベントを記録 |
| Worker開発 | `debug` | それ以外 | 開発時のデバッグを支援 |
| Tipitaka CLI | `info` | CLI logger単体 | 通常のCLIログ量を抑える |
| `bun run tipitaka` | `debug` | CLIエントリーポイント | 取込進捗を出力する |

### 明示的な設定

環境変数`LOG_LEVEL`で明示的に設定すると、環境別のデフォルトを上書きできます：

```bash
# .env.local（開発環境でもinfoレベル以上のみ）
LOG_LEVEL=info

# テスト環境でもログを見たい場合（vitest.config.ts）
env: {
  LOG_LEVEL: "debug",
}
```

## オブザーバビリティのベストプラクティス

オブザーバビリティ・エンジニアリングの原則に基づいたログ戦略：

### 1. ログの目的

ログは**問題の診断とトラブルシューティング**のために使用します。本番環境では通常、正常フローではログを出しませんが、**DEBUGレベルで正常フローの重要なポイントを記録**することで、必要に応じて有効化してトラブルシューティングに活用できます。

### 2. 適切なログレベルを使う

- **DEBUG**: 正常フローの追跡情報（本番ではデフォルトで出力されないが、必要に応じて有効化可能）
  - エントリーポイント（リクエスト受信、関数開始など）
  - 主要な分岐点（条件分岐、ループの開始/終了など）
  - 重要な処理の完了（データ取得完了、レンダリング完了など）
- **INFO**: 重要なビジネスイベントのみ（例: アーカイブされたページへのアクセス、重要な状態変更）
- **WARN**: 異常な状態だが処理は継続できる（例: 期待しないステータス、データ不整合の可能性）
- **ERROR**: エラーが発生したがアプリケーションは継続できる

**原則**: 
- 本番環境のデフォルト: エラー、警告、重要なビジネスイベントのみ記録
- DEBUGレベルで正常フローの重要なポイントを記録（必要に応じて有効化）
- リクエストIDなどでログを追跡可能にする

### 3. ログを記録すべきケース

✅ **記録する**:
- エラーが発生した場合
- 異常な状態（期待しない値、データ不整合など）
- 重要なビジネスイベント（例: アーカイブされたページへのアクセス）
- セキュリティ関連のイベント

❌ **記録しない**:
- 正常なリクエスト処理
- データベースクエリの成功
- 正常なページレンダリング
- 正常なデータ取得

### 2. 構造化ログを使う

❌ 悪い例:
```typescript
logger.info(`User ${userId} accessed page ${pageSlug}`);
```

✅ 良い例:
```typescript
logger.info({ userId, pageSlug }, "User accessed page");
```

### 3. コンテキスト情報を含める（リクエスト追跡）

リクエストIDを含めることで、1つのリクエストに関連するすべてのログを追跡できます：

```typescript
const logger = createServerLogger("request", {
  requestId: request.id,  // 重要: リクエスト追跡のため
  userId: user.id,
  path: request.path,
});

// 同じリクエストIDで複数のログを出力すると、後で追跡しやすい
logger.debug({ requestId: request.id, pageSlug }, "Request started");
logger.debug({ requestId: request.id, pageSlug }, "Data fetched");
logger.debug({ requestId: request.id, pageSlug }, "Response sent");
```

本番環境で問題が発生した場合、`LOG_LEVEL=debug`に設定して再現させれば、そのリクエストIDに関連するすべてのDEBUGログを取得できます。

### 4. 機密情報を避ける

❌ 悪い例:
```typescript
logger.info({ password, creditCard }, "User data");
```

✅ 良い例:
```typescript
logger.info({ userId, email }, "User data");
```

### 5. エラーは適切に記録

```typescript
try {
  // ...
} catch (error) {
  logger.error({ err: error, context: "page-load" }, "Failed to load page");
  throw error; // 必要に応じて再スロー
}
```

### 6. 正常フローの追跡（DEBUGレベル）

正常フローでもトラブルシューティング時に追跡できるよう、**DEBUGレベルで重要なポイントを記録**します。本番環境ではデフォルトで出力されませんが、必要に応じて`LOG_LEVEL=debug`で有効化できます。

✅ **良い例**: DEBUGレベルで正常フローを記録
```typescript
// エントリーポイント: リクエスト受信
logger.debug({ pageSlug, locale, handle }, "Page view request received");

// データ取得の開始と完了
logger.debug({ pageSlug }, "Fetching page context");
const data = await fetchPageContext(pageSlug, locale);
logger.debug({ pageSlug, found: !!data }, "Page context fetched");

if (!data) {
  // 警告: データが見つからない（異常な状態）
  logger.warn({ pageSlug, locale, handle }, "Page context not found");
  return notFound();
}

if (pageDetail.status !== "PUBLIC") {
  // 警告: 期待しないステータス（異常な状態）
  logger.warn({ pageSlug, status: pageDetail.status }, "Page status is not PUBLIC");
  return notFound();
}

// 重要なビジネスイベントのみ記録（INFOレベル）
if (pageDetail.status === "ARCHIVE") {
  logger.info({ pageSlug, pageId: pageDetail.id }, "Archived page accessed");
}

// 処理完了
logger.debug({ pageSlug }, "Page rendered successfully");
```

❌ **悪い例**: 過剰なDEBUGログ（細かすぎる）
```typescript
// 過剰: すべてのステップでログを出す（不要）
logger.debug({ pageSlug }, "Starting function");
logger.debug({ pageSlug }, "Validating input");
logger.debug({ pageSlug }, "Input validated");
logger.debug({ pageSlug }, "Calling database");
logger.debug({ pageSlug }, "Database called");
// ... など
```

**バランス**: エントリーポイント、主要な分岐点、重要な処理の完了など、**トラブルシューティングに役立つ最小限のポイント**のみ記録します。

### 7. 高頻度イベントのサンプリング

高頻度で発生するイベント（例: ページビュー）は、全件記録せずにサンプリングを検討：

```typescript
// サンプリング例: 100件に1件のみ記録
const shouldLog = Math.random() < 0.01; // 1%の確率
if (shouldLog) {
  logger.info({ pageSlug, userId }, "Page view (sampled)");
}
```

ただし、エラーや警告は**常に記録**してください。

## 出力形式

開発・テスト・本番のすべてで、Cloudflare Workersが直接処理できるJSON形式の構造化ログを出力します：

```json
{
  "level": "info",
  "time": "2024-01-15T01:30:45.123Z",
  "service": "request",
  "path": "/en/example",
  "durationMs": 42,
  "msg": "Request completed"
}
```

このJSON形式は、ログ管理ツール（Datadog、Elasticsearch、CloudWatchなど）で簡単に解析できます。

## 一時的なデバッグログについて

調査目的で追加した一時的なデバッグログは、以下のいずれかを行ってください：

1. **削除する**: 問題が解決したら削除（推奨）
2. **DEBUGレベルにする**: 本番環境ではデフォルトで出力されないが、必要に応じて有効化可能
```

**通常のDEBUGログとの違い**:
- **通常のDEBUGログ**: 正常フローの重要なポイントを常に記録（本番では`LOG_LEVEL=debug`で有効化）
- **一時的なデバッグログ**: 特定の問題調査のためだけに追加（調査後は削除）

## 本番環境でのDEBUGログの活用

本番環境で問題が発生した場合、DEBUGログを有効化して正常フローを追跡できます：

Cloudflare Workerの`LOG_LEVEL` bindingを`debug`へ変更してください。

**使用シナリオ**:
- 特定のリクエストで問題が発生している場合
- パフォーマンス問題の調査
- データフローの確認
- 新しい機能のデプロイ後の動作確認

**注意**: DEBUGログは大量に出力されるため、調査が終わったら`LOG_LEVEL=info`に戻してください。

## ログ量の目安

本番環境でのログ量の目安：

- **デフォルト（LOG_LEVEL=info）**: 1リクエストあたり 0-2ログ（エラー・警告・重要なイベントのみ）
- **DEBUG有効時（LOG_LEVEL=debug）**: 1リクエストあたり 5-10ログ（エントリーポイント、主要な分岐点、処理完了など）
- **正常フロー**: DEBUGレベルで記録（本番ではデフォルトで出力されない）
- **エラー・警告**: 設定したLOG_LEVEL以上の場合に記録

**注意**: ログ量が多すぎると：
- ストレージコストが増加
- ログ解析が困難になる
- パフォーマンスに影響する可能性がある
- 重要なログが見つけにくくなる

**推奨アプローチ**:
- 正常フローの重要なポイントはDEBUGレベルで記録
- 本番環境ではデフォルトで`LOG_LEVEL=info`を使用
- トラブルシューティング時のみ`LOG_LEVEL=debug`に変更
- リクエストIDを含めてログを追跡可能にする
