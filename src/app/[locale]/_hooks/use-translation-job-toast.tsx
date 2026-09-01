"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	isTranslationJobTerminalStatus,
	type TranslationJobForToast,
} from "@/app/types/translation-job";
import { JobsView } from "./jobs-view";

const areJobsDone = (jobs: TranslationJobForToast[]) =>
	jobs.every((job) => isTranslationJobTerminalStatus(job.status));

const toastStyle = {
	unstyled: true,
	className: "w-72 rounded-xl border  p-4 shadow-xl",
};

export function useTranslationJobToast(jobs: TranslationJobForToast[]) {
	const idRef = useRef<string | number>(undefined);

	// 生成・更新・完了後のIDクリアを1つのエフェクトで行う
	// （id が未定義なら toast() が新規作成し、あれば同じトーストを更新する）
	useEffect(() => {
		if (!jobs.length) return;

		const done = areJobsDone(jobs);
		idRef.current = toast(<JobsView jobs={jobs} />, {
			id: idRef.current,
			duration: done ? 3000 : Number.POSITIVE_INFINITY,
			...toastStyle,
			classNames: {
				closeButton:
					"absolute right-2 top-2 text-muted-foreground cursor-pointer",
			},
		});

		if (done) {
			const timeout = setTimeout(() => {
				idRef.current = undefined;
			}, 3100);
			return () => clearTimeout(timeout);
		}
	}, [jobs]);
}
