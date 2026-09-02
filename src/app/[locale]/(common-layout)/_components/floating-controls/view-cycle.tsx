import { FileText } from "lucide-react";
import { useTranslations } from "use-intl";
import type { View } from "@/app/_constants/view";
import { Button } from "@/components/ui/button";
import { pageDetailRoute } from "@/app/[locale]/(common-layout)/_components/page-detail-route-api";

const getNextView = (view: View): View =>
	view === "user" ? "source" : view === "source" ? "both" : "user";

interface Props {
	afterClick?: () => void;
	userLocale: string;
	sourceLocale: string;
}

export function ViewCycle({ afterClick, userLocale, sourceLocale }: Props) {
	const t = useTranslations("FloatingControls");
	const view = pageDetailRoute.useSearch({ select: (search) => search.view });
	const navigate = pageDetailRoute.useNavigate();

	const sourceLabel =
		sourceLocale === "mixed" ? (
			<FileText
				aria-hidden
				className="h-5 w-5"
				data-testid="source-mixed-icon"
			/>
		) : (
			<span>{sourceLocale.toUpperCase()}</span>
		);

	const handleClick = () => {
		void navigate({
			search: (previous) => ({
				...previous,
				view: getNextView(previous.view),
			}),
			replace: true,
		});
		afterClick?.();
	};

	/* ボタン内部の表示内容 */
	const inner =
		view === "user" ? (
			<span>{userLocale.toUpperCase()}</span>
		) : view === "source" ? (
			sourceLabel
		) : (
			<span className="flex items-center gap-1 scale-90">
				<span className="text-[10px] leading-none">
					{userLocale.toUpperCase()}
				</span>
				<span className="text-[10px] leading-none">/</span>
				<span className="text-[10px] leading-none">{sourceLabel}</span>
			</span>
		);

	/* アクセシブルラベル */
	const label =
		view === "user"
			? t("viewUserOnly")
			: view === "source"
				? t("viewSourceOnly")
				: t("viewBoth");

	return (
		<Button
			aria-label={label}
			className="h-10 px-3 rounded-full bg-background font-semibold text-xs cursor-pointer hover:scale-100 active:scale-100"
			onClick={handleClick}
			title={label}
			variant="ghost"
		>
			{inner}
		</Button>
	);
}
