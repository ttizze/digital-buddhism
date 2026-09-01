"use client";

import { useNavigate } from "@tanstack/react-router";
import { Edit3, FileText, SearchIcon, User } from "lucide-react";
import { type FormEvent, useRef, useTransition } from "react";
import {
	CATEGORIES,
	type Category,
} from "@/app/[locale]/(common-layout)/search/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function renderIcon(category: Category) {
	switch (category) {
		case "title":
			return <FileText className="mr-1 h-4 w-4" />;
		case "user":
			return <User className="mr-1 h-4 w-4" />;
		case "content":
			return <Edit3 className="mr-1 h-4 w-4" />;
		default:
			return null;
	}
}

export function SearchPageClient({
	category,
	locale,
	query,
}: {
	category: Category;
	locale: string;
	query: string;
}) {
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);

	function handleTabChange(newCat: Category) {
		const nextQuery = inputRef.current?.value ?? query;
		startTransition(async () => {
			await navigate({
				to: "/$locale/search",
				params: { locale },
				search: (previous) => ({
					...previous,
					category: newCat,
					page: 1,
					query: nextQuery,
				}),
			});
		});
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextQuery = inputRef.current?.value ?? query;
		startTransition(async () => {
			await navigate({
				to: "/$locale/search",
				params: { locale },
				search: (previous) => ({
					...previous,
					category,
					page: 1,
					query: nextQuery,
				}),
			});
		});
	}

	return (
		<div className="">
			<form className="mb-6" onSubmit={handleSubmit}>
				<div className="relative">
					<Input
						className="w-full py-3 pl-4 pr-12 rounded-full border"
						defaultValue={query}
						name="query"
						placeholder="Search..."
						ref={inputRef}
						required
						type="search"
					/>
					<Button
						aria-label="Search"
						className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full"
						size="icon"
						type="submit"
					>
						<SearchIcon className="size-4" />
					</Button>
				</div>
			</form>

			<Tabs
				onValueChange={(val) => {
					handleTabChange(val as Category);
				}}
				value={category}
			>
				<TabsList className="mb-6 border-b w-full flex rounded-full">
					{CATEGORIES.map((cat) => (
						<TabsTrigger
							className="flex-1 items-center justify-center rounded-full text-sm"
							key={cat}
							value={cat}
						>
							{renderIcon(cat)}
							{cat.charAt(0).toUpperCase() + cat.slice(1)}
						</TabsTrigger>
					))}
				</TabsList>
				{CATEGORIES.map((cat) => (
					<TabsContent key={cat} value={cat} />
				))}
			</Tabs>
			{isPending && <p className="text-gray-400">Loading...</p>}
		</div>
	);
}
