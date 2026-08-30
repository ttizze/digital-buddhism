import useSWR from "swr";
import {
	isTranslationJobTerminalStatus,
	type TranslationJobForToast,
} from "@/app/types/translation-job";

const fetcher = async (url: string): Promise<TranslationJobForToast[]> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch translation jobs: ${response.status}`);
	}
	return response.json();
};
const isTerminalJob = (job: TranslationJobForToast) =>
	isTranslationJobTerminalStatus(job.status);

export function useTranslationJobs(
	initial: TranslationJobForToast[],
	interval = 3000,
) {
	const ids = initial.map((j) => j.id);
	const key = ids.length
		? `/api/translation-jobs?${ids.map((id) => `id=${id}`).join("&")}`
		: null;

	const { data } = useSWR<TranslationJobForToast[]>(key, fetcher, {
		refreshInterval: (latest) => {
			// latestがundefinedの場合もポーリングを継続
			if (!latest) return interval;
			return latest.every(isTerminalJob) ? 0 : interval;
		},
		fallbackData: initial,
		// タブが非アクティブでも更新を継続
		refreshWhenHidden: true,
		// フォーカス時に再検証
		revalidateOnFocus: true,
		// エラー時も再試行を継続
		errorRetryCount: 10,
		errorRetryInterval: interval,
	});

	const allDone = data?.every(isTerminalJob) ?? false;

	return { toastJobs: data ?? initial, allDone };
}
