import { type RefObject, useEffect, useRef, useState } from "react";
import { subscribeScrollY } from "./scroll-y-store";

// 小さなスクロールの揺れで表示/固定が切り替わらないようにするしきい値
const SCROLL_THRESHOLD = 5;

interface UseHeaderScrollResult {
	// ヘッダーの参照
	headerRef: RefObject<HTMLDivElement | null>;
	// ヘッダーが固定されているか
	isPinned: boolean;
	// ヘッダーが表示されているか
	isVisible: boolean;
	// ヘッダーの高さ
	headerHeight: number;
}

/**
 * ヘッダーのスクロール動作を管理するカスタムフック
 */
export function useHeaderScroll(): UseHeaderScrollResult {
	const [isPinned, setIsPinned] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const headerRef = useRef<HTMLDivElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);

	// スクロールは高頻度なので、スクロール量などは state にせず ref で保持し、
	// state 更新は「表示/固定」が切り替わったときだけに絞る。
	const lastScrollYRef = useRef(0);
	const headerOffsetRef = useRef(0);
	const isPinnedRef = useRef(false);
	const isVisibleRef = useRef(true);

	useEffect(() => {
		const measureHeader = () => {
			if (!headerRef.current) return;
			setHeaderHeight(headerRef.current.offsetHeight);
			headerOffsetRef.current =
				headerRef.current.getBoundingClientRect().top + window.scrollY;
		};

		measureHeader();

		// ヘッダーの高さが変わる場合に追従（メニュー展開など）
		if (!headerRef.current || typeof ResizeObserver === "undefined") return;
		const resizeObserver = new ResizeObserver(() => {
			if (!headerRef.current) return;
			setHeaderHeight(headerRef.current.offsetHeight);
		});
		resizeObserver.observe(headerRef.current);
		return () => resizeObserver.disconnect();
	}, []);

	useEffect(() => {
		// 購読直後の通知を「静止」と判定させるため、購読前に現在値を控える
		lastScrollYRef.current = window.scrollY;

		// scroll-y-store が rAF でバッチ済みの値を届けるため、ここでは間引かない
		return subscribeScrollY((currentScrollY) => {
			const last = lastScrollYRef.current;
			const isScrollingDown = currentScrollY > last;
			const isScrollingUp = currentScrollY < last;
			const scrollDifference = Math.abs(currentScrollY - last);

			let nextPinned = isPinnedRef.current;
			let nextVisible = isVisibleRef.current;

			if (currentScrollY <= 0) {
				nextPinned = false;
				nextVisible = true;
			} else if (
				headerOffsetRef.current > 0 &&
				currentScrollY < headerOffsetRef.current
			) {
				nextPinned = false;
				nextVisible = true;
			} else if (isScrollingDown && scrollDifference > SCROLL_THRESHOLD) {
				nextVisible = false;
				nextPinned = false;
			} else if (isScrollingUp && scrollDifference > SCROLL_THRESHOLD) {
				nextVisible = true;
				nextPinned = true;
			}

			if (nextPinned !== isPinnedRef.current) {
				isPinnedRef.current = nextPinned;
				setIsPinned(nextPinned);
			}
			if (nextVisible !== isVisibleRef.current) {
				isVisibleRef.current = nextVisible;
				setIsVisible(nextVisible);
			}

			lastScrollYRef.current = currentScrollY;
		});
	}, []);

	return { headerRef, isPinned, isVisible, headerHeight };
}
