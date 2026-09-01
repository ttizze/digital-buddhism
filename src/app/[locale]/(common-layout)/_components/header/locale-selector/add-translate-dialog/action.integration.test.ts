import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/app/_service/auth-server";
import { enqueueTranslationMessage } from "@/app/[locale]/_infrastructure/translation-queue/context.server";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPageWithAnnotations,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { executeTranslateAction } from "./execute-translate-action.server";

await setupDbPerFile(import.meta.url);

// 外部システムのみモック（キューシステム）
vi.mock(
	"@/app/[locale]/_infrastructure/translation-queue/context.server",
	() => ({
		enqueueTranslationMessage: vi.fn(),
	}),
);

describe("translateAction", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.mocked(enqueueTranslationMessage).mockResolvedValue(undefined);
	});

	afterEach(async () => {
		await resetDatabase();
	});

	it("無効な入力データが渡された場合、バリデーションエラーを返す", async () => {
		// Arrange: 実際のユーザーを作成し、認証をモック（セッション管理は外部システム）
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const invalidFormData = new FormData();
		// aiModelとtargetLocaleが必須だが、空文字列を送信

		// Act
		const result = await executeTranslateAction(invalidFormData);

		// Assert: バリデーションエラーが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("認証されていないユーザーがアクセスした場合、リダイレクトされる", async () => {
		// Arrange: 認証されていない状態をモック
		vi.mocked(getCurrentUser).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageSlug", "test-page");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");

		// Act: TanStack RouterのredirectはResponseをthrowする
		const redirectResponse = await executeTranslateAction(formData).catch(
			(error: unknown) =>
				error instanceof Response ? error : Promise.reject(error),
		);

		// Assert: ログイン画面へ307リダイレクトされる
		expect(redirectResponse).toBeInstanceOf(Response);
		if (!(redirectResponse instanceof Response)) {
			throw new Error("リダイレクトされていません");
		}
		expect(redirectResponse.status).toBe(307);
		expect(redirectResponse.headers.get("Location")).toBe("/auth/login");
	});

	it("存在しないページを翻訳しようとした場合、エラーメッセージを返す", async () => {
		// Arrange: 実際のユーザーを作成
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", "non-existent-page");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");

		// Act
		const result = await executeTranslateAction(formData);

		// Assert: エラーメッセージが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.message).toBe("Page not found");
	});

	it("有効な入力データでページを翻訳した場合、翻訳ジョブが作成され成功レスポンスが返る", async () => {
		// Arrange: 実際のユーザーとページを作成
		const user = await createUser();
		const page = await createPageWithSegments({
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Test Page Title",
					textAndOccurrenceHash: "hash-title",
				},
				{
					number: 1,
					text: "First paragraph",
					textAndOccurrenceHash: "hash-1",
				},
			],
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", page.slug);
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "ja");

		// Act
		const result = await executeTranslateAction(formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.translationJobs).toHaveLength(1);
		}

		// Assert: 翻訳ジョブがデータベースに作成されている（実際のDBで検証）
		const jobs = await db
			.selectFrom("translationJobs")
			.selectAll()
			.where("pageId", "=", page.id)
			.execute();
		expect(jobs).toHaveLength(1);
		expect(jobs[0]?.locale).toBe("ja");
		expect(jobs[0]?.aiModel).toBe("gemini-pro");

		// Assert: キューにジョブがエンキューされている（外部システムのモック）
		expect(enqueueTranslationMessage).toHaveBeenCalledTimes(1);
	});

	it("再実行時は同じ条件の未完了ジョブをFAILEDにして新しいジョブを作る", async () => {
		const user = await createUser();
		const page = await createPageWithSegments({
			slug: "retry-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "retry-title",
				},
			],
		});
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));
		const createFormData = () => {
			const formData = new FormData();
			formData.append("pageSlug", page.slug);
			formData.append("aiModel", "gemini-3.1-pro-preview");
			formData.append("targetLocale", "ja");
			return formData;
		};

		await executeTranslateAction(createFormData());
		await executeTranslateAction(createFormData());

		const jobs = await db
			.selectFrom("translationJobs")
			.select(["status", "error"])
			.where("pageId", "=", page.id)
			.orderBy("id", "asc")
			.execute();
		expect(jobs).toEqual([
			{
				status: "FAILED",
				error: "Superseded by a new translation run",
			},
			{ status: "PENDING", error: "" },
		]);
	});

	it("ページに注釈がある場合、注釈も翻訳ジョブに含まれる", async () => {
		// Arrange: メインページと注釈を作成
		const user = await createUser();
		const { targetPage, annotationPage } = await createPageWithAnnotations({
			targetPageSlug: "page-with-annotations",
			targetPageSegments: [
				{
					number: 0,
					text: "Page Title",
					textAndOccurrenceHash: "hash-title",
				},
				{
					number: 1,
					text: "Main text",
					textAndOccurrenceHash: "hash-main-1",
				},
			],
			annotationSegments: [
				{
					number: 0,
					text: "Annotation text",
					textAndOccurrenceHash: "hash-anno-0",
					linkedToTargetSegmentNumber: 1,
				},
			],
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", targetPage.slug);
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "ja");

		// Act
		const result = await executeTranslateAction(formData);

		// Assert
		expect(result.success).toBe(true);
		const jobs = await db
			.selectFrom("translationJobs")
			.selectAll()
			.where("pageId", "=", targetPage.id)
			.execute();
		expect(jobs.length).toBeGreaterThanOrEqual(2);

		const annotationCall = vi
			.mocked(enqueueTranslationMessage)
			.mock.calls.find(
				([message]) =>
					message.type === "orchestrate" &&
					message.params.annotationPageId === annotationPage.id,
			);
		expect(annotationCall?.[0]).toMatchObject({
			type: "orchestrate",
			params: {
				annotationPageId: annotationPage.id,
				pageId: targetPage.id,
				targetLocale: "ja",
			},
		});
	});
});
