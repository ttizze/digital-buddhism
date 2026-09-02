import { useLocation } from "@tanstack/react-router";
import {
	lazy,
	Suspense,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const AddAndVoteTranslations = lazy(() =>
	import("./translation-section/add-and-vote-translations").then((module) => ({
		default: module.AddAndVoteTranslations,
	})),
);

type ActiveState = {
	segmentId: number;
	rootEl: HTMLElement;
	translationEl: HTMLElement;
};

type TranslationFormRenderer = (
	segmentId: number,
	translationElement: HTMLElement,
) => ReactNode;

/** Portal用rootを.seg-trの直後に確保（既存があれば再利用） */
function ensureFormRoot(afterEl: Element): HTMLElement {
	const next = afterEl.nextElementSibling;
	if (next instanceof HTMLElement && next.dataset.trFormRoot) return next;

	const root = document.createElement("div");
	root.dataset.trFormRoot = "1";
	root.className = "not-prose";
	afterEl.insertAdjacentElement("afterend", root);
	return root;
}

const isClickOnText = (e: MouseEvent) => {
	// Chrome: caretRangeFromPoint / Safari: caretPositionFromPoint
	// jsdom や一部環境では API が無いので、その場合はチェックをスキップする。
	if (!document.caretRangeFromPoint && !document.caretPositionFromPoint)
		return true;

	const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
	if (range) return range.startContainer.nodeType === Node.TEXT_NODE;

	const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
	return pos?.offsetNode?.nodeType === Node.TEXT_NODE;
};

function hasSelection(): boolean {
	const sel = window.getSelection?.();
	return !!sel && !sel.isCollapsed && sel.toString().length > 0;
}

/** data-segment-id を持つ要素を取得（リンク内は除外） */
function getSegmentEl(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof Element)) return null;
	const el = target.closest("[data-segment-id]");
	if (!(el instanceof HTMLElement) || el.closest("a")) return null;
	return el;
}

function renderTranslationForm(
	segmentId: number,
	translationElement: HTMLElement,
): ReactNode {
	return (
		<Suspense fallback={null}>
			<AddAndVoteTranslations
				segmentId={segmentId}
				translationElement={translationElement}
			/>
		</Suspense>
	);
}

export function TranslationFormOnClick() {
	const pathname = useLocation({ select: (location) => location.pathname });
	return (
		<TranslationFormEventBridge
			pathname={pathname}
			renderForm={renderTranslationForm}
		/>
	);
}

/** document.body のイベントを、クリックされた訳文直後のフォームへ接続する。 */
export function TranslationFormEventBridge({
	pathname,
	renderForm,
}: {
	pathname: string;
	renderForm: TranslationFormRenderer;
}) {
	const [activeState, setActiveState] = useState<ActiveState | null>(null);
	const stateRef = useRef<ActiveState | null>(null);

	useEffect(() => {
		let hadSelectionOnPointerDown = false;

		/** セグメントのトグル処理（開く/閉じる） */
		const toggleSegment = (el: HTMLElement) => {
			const segId = Number(el.dataset.segmentId);
			if (!Number.isFinite(segId)) return;

			// 同じセグメントをクリック → 閉じる
			if (stateRef.current?.segmentId === segId) {
				stateRef.current = null;
				setActiveState(null);
				return;
			}

			const translationBlock = el.closest(".seg-tr");
			if (!translationBlock) return;

			const rootEl = ensureFormRoot(translationBlock);
			const nextState = { segmentId: segId, rootEl, translationEl: el };
			stateRef.current = nextState;
			setActiveState(nextState);
		};

		const onPointerDown = () => {
			hadSelectionOnPointerDown = hasSelection();
		};

		const onClick = (e: MouseEvent) => {
			if (hadSelectionOnPointerDown || hasSelection()) return;
			if (!isClickOnText(e)) return;

			const el = getSegmentEl(e.target);
			if (el) toggleSegment(el);
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Enter" && e.key !== " ") return;

			const el = getSegmentEl(e.target);
			if (!el) return;

			if (e.key === " ") e.preventDefault();
			toggleSegment(el);
		};

		document.body.addEventListener("pointerdown", onPointerDown, true);
		document.body.addEventListener("click", onClick);
		document.body.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.removeEventListener("pointerdown", onPointerDown, true);
			document.body.removeEventListener("click", onClick);
			document.body.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	useEffect(() => {
		stateRef.current = null;
		setActiveState(null);
	}, [pathname]);

	if (!activeState) return null;

	return createPortal(
		renderForm(activeState.segmentId, activeState.translationEl),
		activeState.rootEl,
	);
}
