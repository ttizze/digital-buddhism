# パフォーマンス改善の測定手順

変更前後を同じ production build、URL、Lighthouse 設定で計測します。
Vite の開発サーバーは未圧縮・未 minify のモジュールを配信するため、性能比較には
使用しません。

## 1. ローカルDBを先に起動する

すべてのコマンドは `nix develop` 内で実行します。別のターミナルでローカル
libSQLを起動し、準備完了を確認します。

```bash
sqld \
  --db-path "$PWD/.data/digital-buddshim.sqld" \
  --http-listen-addr 127.0.0.1:18080 \
  --max-response-size 128MB \
  --max-total-response-size 256MB \
  --no-welcome
```

```bash
curl --fail http://127.0.0.1:18080/version
```

Tipiṭaka DBの data と WAL が大きい場合、起動に5秒以上かかります。その状態で
`bun run dev` を先に実行すると、`db:with-local` の起動待ち上限を超えて終了時に
`hrana server loop exited` / `Invalid argument` が表示されることがあります。
上記のように `sqld` を先に起動すれば、同じDBへ接続して処理を続行できます。

## 2. production Workerを起動する

```bash
bun run build

wrangler dev \
  --config dist/server/wrangler.json \
  --port 3000 \
  --persist-to "$PWD/.wrangler/state" \
  --var TURSO_DATABASE_URL:http://127.0.0.1:18080 \
  --var BETTER_AUTH_SECRET:digital-buddshim-local-development-secret \
  --var VITE_PUBLIC_DOMAIN:http://localhost:3000
```

`vp preview` はこの用途では使用しません。生成済み Worker に必要なローカル変数を
明示できず、認証設定エラーで500になるためです。一時的な
`dist/server/.dev.vars` で回避しても、preview応答はgzip/Brotli圧縮されず、総転送量が
実運用条件と一致しません。

`--persist-to` は必須です。生成済み config は `dist/server` にあるため、省略すると
Wrangler は空の `dist/server/.wrangler/state` を作ります。公開 Tipiṭaka ページは
KV read modelを読むため、空のstateでは404になります。リポジトリ直下の
`.wrangler/state` は `bun run tipitaka` または `bun run tipitaka:read-model` が生成します。

## 3. Lighthouseを5回実行する

変更単位の一時ディレクトリに JSON を保存します。変更前後でURLとオプションを
変えません。

```bash
DIGITAL_BUDDHISM_CHANGE_ID=20260903-page-load
DIGITAL_BUDDHISM_LOG_ROOT=/tmp/digital-buddhism-perf/$DIGITAL_BUDDHISM_CHANGE_ID
DIGITAL_BUDDHISM_URL=http://localhost:3000/ja/tipitaka/tipitaka-s0101m-mul-xml
DIGITAL_BUDDHISM_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$DIGITAL_BUDDHISM_LOG_ROOT/before"

for DIGITAL_BUDDHISM_RUN in 1 2 3 4 5; do
  npx --yes lighthouse@12.8.2 "$DIGITAL_BUDDHISM_URL" \
    --only-categories=performance \
    --output=json \
    --output-path="$DIGITAL_BUDDHISM_LOG_ROOT/before/run-$DIGITAL_BUDDHISM_RUN.json" \
    --chrome-path="$DIGITAL_BUDDHISM_CHROME_PATH" \
    --chrome-flags="--headless --disable-gpu" \
    --quiet
done
```

変更後は同じコマンドの出力先だけを `after` に変えます。ChromeとLighthouseの
バージョンも揃えます。macOS以外では `DIGITAL_BUDDHISM_CHROME_PATH` をローカルの
Chrome/Chromium実行ファイルへ変更します。

## 4. 比較する

単発スコアではなく、5回の中央値で FCP、LCP、TBT、CLS、TTFB、総転送量を比較
します。Lighthouse の `audits` から各値を抽出し、外れ値と server log も確認します。

- FCP/LCP短縮: 初期表示の体感改善
- TBT短縮: 操作可能になるまでのCPU停止を削減
- TTFB増加: Worker、KV、DB、SSR処理の回帰候補
- 総転送量削減: mobile回線でのFCP/LCP改善候補
