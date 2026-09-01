"use client";

import { ArrowUpFromLine } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useLocale } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";

export function AddTextCandidateForm({
	endpoint,
	hiddenFields,
	placeholder,
	submitLabel,
	onAdded,
}: {
	endpoint: string;
	hiddenFields: Record<string, string | number>;
	placeholder: string;
	submitLabel: string;
	onAdded?: () => unknown | Promise<unknown>;
}) {
	const hydrated = useHydrated();
	const locale = useLocale();
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const formRef = useRef<HTMLFormElement>(null);
	const addingRef = useRef(false);
	const [state, setState] = useState<ActionResponse>({ success: false });
	const [isAdding, setIsAdding] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (addingRef.current) return;
		addingRef.current = true;
		setIsAdding(true);
		setState({ success: false });

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				body: new FormData(event.currentTarget),
				credentials: "same-origin",
			});
			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
				return;
			}

			const body = (await response.json()) as ActionResponse & {
				error?: string;
			};
			if (!response.ok) {
				setState({
					success: false,
					message: body.message ?? body.error,
					zodErrors: "zodErrors" in body ? body.zodErrors : undefined,
				});
				return;
			}

			setState(body);
			if (body.success) {
				formRef.current?.reset();
				await onAdded?.();
			}
		} catch {
			setState({ success: false });
		} finally {
			addingRef.current = false;
			setIsAdding(false);
		}
	};

	return (
		<span className="mt-4 block px-4">
			<form onSubmit={handleSubmit} ref={formRef}>
				{Object.entries(hiddenFields).map(([name, value]) => (
					<input key={name} name={name} type="hidden" value={value} />
				))}
				<span className="relative">
					<TextareaAutosize
						className={`mb-2 w-full resize-none overflow-hidden rounded-xl border border-gray-500 bg-background p-2 text-base! ${!currentUser && "bg-muted"}`}
						disabled={!currentUser}
						minRows={3}
						name="text"
						placeholder={placeholder}
						required
					/>
					{!currentUser && (
						<StartButton className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform" />
					)}
				</span>
				<span className="flex items-center justify-end space-x-2">
					{!state.success && state.zodErrors?.text && (
						<p className="text-sm text-red-500">{state.zodErrors.text}</p>
					)}
					{!state.success && state.message && (
						<p className="text-sm text-red-500">{state.message}</p>
					)}
					<Button
						className="rounded-xl"
						disabled={isAdding || !currentUser}
						type="submit"
					>
						<ArrowUpFromLine className="h-4 w-4" />
						{submitLabel}
					</Button>
				</span>
			</form>
		</span>
	);
}
