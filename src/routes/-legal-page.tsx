import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface LegalSection {
	heading?: string;
	body: ReactNode;
}

/** 利用規約・プライバシーポリシー共通のページ骨格 */
export function LegalPage({
	locale,
	title,
	sections,
}: {
	locale: string;
	title: string;
	sections: LegalSection[];
}) {
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-6">{title}</h1>
				{sections.map((section) => (
					<section className="mb-8" key={section.heading ?? "intro"}>
						{section.heading && (
							<h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
						)}
						{section.body}
					</section>
				))}
				<div className="mt-8">
					<Link
						className="text-blue-600 hover:underline"
						params={{ locale }}
						to="/$locale/tipitaka"
					>
						Return to Home
					</Link>
				</div>
			</main>
		</div>
	);
}
