import { useEffect, useRef, useState } from "react";
import { subscribeScrollY } from "@/app/[locale]/(common-layout)/_components/header/hooks/scroll-y-store";

/**
 * 読み込み時に表示 → 下スクロールで非表示 → 上スクロールで再表示
 */
export function useScrollVisibility() {
	const [isVisible, setVisible] = useState(true); // ① 初期表示

	const lastY = useRef(0); // 前回の scrollY
	const ignore = useRef(false); // クリック直後無視
	const visibleRef = useRef(true);

	/**
	 * ボタン押下直後はスクロールイベントが同フレームで発火しやすく、
	 * 可視状態の切り替えが走ってフローティングUIがチラつくため、
	 * 短時間だけスクロール判定を無効化して安定させる。
	 */
	const ignoreNextScroll = (ms = 100) => {
		ignore.current = true;
		setTimeout(() => {
			ignore.current = false;
		}, ms);
	};

	useEffect(() => {
		// scroll-y-store が rAF でバッチ済みの値を届けるため、ここでは間引かない
		return subscribeScrollY((scrollY) => {
			if (ignore.current) return;

			const dir = scrollY - lastY.current; // +down / –up
			// ② 上スクロール or 最上部近くなら表示
			const next = dir <= 0 || scrollY < window.innerHeight * 0.03;

			if (next !== visibleRef.current) {
				visibleRef.current = next;
				setVisible(next);
			}

			lastY.current = scrollY;
		});
	}, []);

	return { isVisible, ignoreNextScroll };
}
