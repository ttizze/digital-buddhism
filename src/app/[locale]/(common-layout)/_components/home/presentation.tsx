import type { HomeData } from "@/routes/$locale/-index-data";
import { TipitakaPageList } from "../tipitaka-page-list/tipitaka-page-list";

export function HomePresentation({
	locale,
	data,
}: {
	locale: string;
	data: HomeData;
}) {
	return <TipitakaPageList locale={locale} pages={data.tipitakaPages} />;
}
