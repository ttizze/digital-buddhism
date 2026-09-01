"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "use-intl";

export function ModeToggle() {
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
