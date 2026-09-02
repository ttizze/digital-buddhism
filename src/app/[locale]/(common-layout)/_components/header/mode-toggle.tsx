import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { Ref } from "react";
import { useTranslations } from "use-intl";

// DropdownMenuItem asChild 経由で描画されるため、Radix が渡す ref を button へ
// 転送する必要がある（メニュー項目の登録とキーボードフォーカスに使われる）
export function ModeToggle({ ref }: { ref?: Ref<HTMLButtonElement> }) {
	const t = useTranslations("ModeToggle");
	const { theme, setTheme } = useTheme();
	const isLight = theme === "light";

	function toggleTheme() {
		setTheme(isLight ? "dark" : "light");
	}

	return (
		<button
			className="w-full gap-2 flex cursor-pointer items-center px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
			onClick={toggleTheme}
			ref={ref}
			type="button"
		>
			<Sun
				className={`w-4 h-4  ${isLight ? "rotate-0 scale-100 " : "hidden"}`}
			/>
			<Moon
				className={`w-4 h-4 ${isLight ? "hidden" : "rotate-0 scale-100"}`}
			/>
			<span>{isLight ? t("light") : t("dark")}</span>
		</button>
	);
}
