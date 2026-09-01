# Server Function / Action 規約

TanStack StartのServer Functionで、認証・入力検証・返却形式を統一するための正本ドキュメント。

## 目的

- Actionごとの実装揺れをなくす
- 認証漏れ・認可漏れ・エラー握り潰しを防ぐ
- clientへ渡す値を明示的な契約に限定する

## 適用範囲

- `src/app/**/action.ts`
- `src/app/**/execute-*-action.server.ts`
- `src/app/[locale]/_action/*.ts`

## 基本原則

- `createServerFn`はclient/server境界とし、業務ロジックはservice/domain/dbへ寄せる
- 更新処理は`createServerFn({ method: "POST" })`を使う
- `.validator(...)`でtransport入力を検証し、handler内でもFormData等の業務入力を検証する
- 認証済みAPIは常に`currentUser.id`でDB条件を絞る。clientから受けたuser IDを認可に使わない
- clientへ返すDB値は必要な列だけのDTOにする
- FormData ActionはValibotと`ActionResponse<T, U>`を使う

## 認証・バリデーション

### 認証のみ必要な場合

`requireAuth`を使う。未認証時は`/auth/login`へのredirectがthrowされる。

```ts
import { requireAuth } from "@/app/[locale]/_action/auth-and-validate";

const currentUser = await requireAuth();
```

### 認証 + FormData検証が必要な場合

`authAndValidate(schema, formData)`を使う。失敗時は`validationErrors`を返す。

```ts
const result = await authAndValidate(schema, formData);
if (!result.success) {
	return { success: false, validationErrors: result.validationErrors };
}
const { currentUser, data } = result;
```

引数は仕様上必須ならschemaでも必須にする。値がない成功レスポンスや空処理へ分岐させない。

## 返却規約

`src/app/types.ts`の`ActionResponse<T, U>`を使う。

- バリデーション失敗: `{ success: false, validationErrors }`
- 業務ルール失敗: `{ success: false, message }`
- 成功: `{ success: true, data }`
- 成功で戻り値不要: `{ success: true, data: undefined }`

予期可能な失敗は`ActionResponse`で返す。予期しない障害はthrowして上位へ伝搬させる。

## redirect / notFound

`redirect`と`notFound`は`@tanstack/react-router`から使い、throwされた値を`catch`で握り潰さない。成功時redirectはドメイン処理が完了した後に実行する。

## 実装テンプレート

```ts
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";

const schema = v.object({
	id: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
});
type State = ActionResponse<{ updated: boolean }, { id: number }>;

async function executeUpdateAction(formData: FormData): Promise<State> {
	const result = await authAndValidate(schema, formData);
	if (!result.success) {
		return { success: false, validationErrors: result.validationErrors };
	}

	const updated = await updateSomething(result.data.id, result.currentUser.id);
	if (!updated) return { success: false, message: "Update rejected" };
	return { success: true, data: { updated: true } };
}

export const updateAction = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		if (!(data instanceof FormData)) throw new Error("Expected FormData");
		return data;
	})
	.handler(({ data }) => executeUpdateAction(data));
```

## テスト観点

- 未認証時にloginへredirectされる
- 不正入力時に`validationErrors`を返し、副作用を起こさない
- 他ユーザーのリソースを取得・更新できない
- 成功時に`success: true`と必要最小限のDTOを返す

## 参照実装

- `src/app/[locale]/_action/auth-and-validate.ts`
- `src/app/types.ts`
- `src/app/[locale]/(common-layout)/_components/header/locale-selector/add-translate-dialog/action.ts`
