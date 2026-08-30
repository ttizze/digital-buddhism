import { Link } from "@tanstack/react-router";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";

export function PageTreeLink({
	node,
	locale,
}: {
	node: PageForTree;
	locale: string;
}) {
	return (
		<Link
			className="hover:underline"
			params={{ locale, pageSlug: node.slug }}
			to="/$locale/tipitaka/$pageSlug"
		>
			<SegmentElement
				className="line-clamp-1 break-all overflow-wrap-anywhere"
				interactive={false}
				segment={{
					id: node.titleSegmentId,
					pageId: node.id,
					number: 0,
					text: node.titleText,
					translationText: node.titleTranslationText,
				}}
				tagName="span"
			/>
		</Link>
	);
}
