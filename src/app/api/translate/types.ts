/** 翻訳対象セグメント（id付き） */
export type SegmentElement = {
	id: number;
	number: number;
	text: string;
};

/** 翻訳結果の要素（idなし、number と翻訳後 text のペア） */
export type TranslatedElement = {
	number: number;
	text: string;
};

/** 翻訳ジョブのオーケストレーターへ渡すパラメータ */
export interface TranslateJobParams {
	pageId: number;
	translationJobId: number;
	aiModel: string;
	targetLocale: string;
	annotationPageId: number | null;
	/** ユーザー定義の翻訳コンテキスト（翻訳指示） */
	translationContext: string;
}

/** オーケストレーターからチャンク処理へ渡すパラメータ */
export interface TranslateChunkParams extends TranslateJobParams {
	/** チャンク分割後のセグメント（id, number, text を含む） */
	segments: SegmentElement[];
	/** ページタイトル（翻訳プロンプト用） */
	title: string;
	totalChunks: number;
	chunkIndex: number;
}

export type TranslationQueueMessage =
	| { type: "orchestrate"; params: TranslateJobParams }
	| { type: "chunk"; params: TranslateChunkParams };

export type TranslationQueueBinding = {
	send(message: TranslationQueueMessage): Promise<void>;
};
