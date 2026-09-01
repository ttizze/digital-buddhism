"use client";

/**
 * 認証必須のフォーム変更APIを叩く共通ヘルパー。
 * 401 のときはログインページへ遷移して null を返す（呼び出し側は後続処理をスキップする）。
 */
export async function fetchAuthedForm({
	url,
	method,
	body,
	locale,
}: {
	url: string;
	method: "POST" | "PATCH" | "DELETE";
	body: FormData | Record<string, string>;
	locale: string;
}): Promise<Response | null> {
	let formData: FormData;
	if (body instanceof FormData) {
		formData = body;
	} else {
		formData = new FormData();
		for (const [key, value] of Object.entries(body)) {
			formData.set(key, value);
		}
	}

	const response = await fetch(url, {
		method,
		body: formData,
		credentials: "same-origin",
	});
	if (response.status === 401) {
		window.location.assign(`/${locale}/auth/login`);
		return null;
	}
	return response;
}
