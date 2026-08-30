import { Fragment } from "react";
import { TIPITAKA_SYSTEM_USER_HANDLE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageBreadcrumb({
	breadcrumb,
	locale,
}: {
	breadcrumb: PageForTree[];
	locale: string;
}) {
	return (
		<Breadcrumb className="not-prose">
			<BreadcrumbList>
				{breadcrumb.map((node, index) => (
					<Fragment key={node.id}>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<a
									href={`/${locale}/${TIPITAKA_SYSTEM_USER_HANDLE}/${node.slug}`}
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
								</a>
							</BreadcrumbLink>
						</BreadcrumbItem>
						{index < breadcrumb.length - 1 && <BreadcrumbSeparator />}
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
