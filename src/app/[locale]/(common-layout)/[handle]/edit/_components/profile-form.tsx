"use client";

import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, SaveIcon } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { authClient } from "@/app/[locale]/_service/auth-client";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/routes/$locale/-profile-edit-data";
import type { ProfileEditState } from "../_service/profile-edit";

interface ProfileFormProps {
	currentUser: SanitizedUser;
	locale: string;
}

export function ProfileForm({ currentUser, locale }: ProfileFormProps) {
	const router = useRouter();
	const updateProfileFn = useServerFn(updateProfile);
	const [isEditPending, startEditTransition] = useTransition();
	const [editState, setEditState] = useState<ProfileEditState>({
		success: true,
		data: {
			name: currentUser.name,
			profile: currentUser.profile || "",
			twitterHandle: currentUser.twitterHandle || "",
		},
	});
	useEffect(() => {
		const updateNameSession = async () => {
			if (editState.success && editState.message) {
				toast.success(editState.message);
				await authClient.updateUser({
					name: editState.data?.name,
				});
				return;
			}
			if (!editState.success) {
				const errorMessage =
					editState.zodErrors?.name?.[0] ??
					editState.zodErrors?.profile?.[0] ??
					editState.zodErrors?.twitterHandle?.[0] ??
					editState.zodErrors?.handle?.[0];
				if (errorMessage) {
					toast.error(errorMessage);
					return;
				}
				if (editState.message) {
					toast.error(editState.message);
				}
			}
		};

		void updateNameSession();
	}, [editState]);

	const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		formData.set("locale", locale);
		startEditTransition(() => {
			void (async () => {
				const result = await updateProfileFn({ data: formData });
				setEditState(result);
				if (result.success) {
					await router.invalidate({ sync: true });
				}
			})();
		});
	};

	return (
		<div className="space-y-6">
			{/* ---------- Profile info ---------- */}
			<form className="space-y-4" onSubmit={handleProfileSubmit}>
				<input name="handle" type="hidden" value={currentUser.handle} />
				<div>
					<Label htmlFor="display-name">Display Name</Label>
					<Input
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={editState.success ? editState.data?.name : ""}
						id="display-name"
						maxLength={25}
						minLength={3}
						name="name"
						required
					/>
					{!editState.success && editState.zodErrors?.name && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.name}
						</div>
					)}
				</div>

				<div>
					<Label htmlFor="profile">Profile</Label>
					<textarea
						className="w-full h-32 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={editState.success ? editState.data?.profile : ""}
						id="profile"
						name="profile"
					/>
					{!editState.success && editState.zodErrors?.profile && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.profile}
						</div>
					)}
				</div>
				<div>
					<Label htmlFor="twitter-handle">Twitter Handle</Label>
					<Input
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={
							editState.success ? editState.data?.twitterHandle : ""
						}
						id="twitter-handle"
						name="twitterHandle"
						pattern="@[A-Za-z0-9_]+"
						placeholder="start with @. e.g. @tipitaka"
					/>
					{!editState.success && editState.zodErrors?.twitterHandle && (
						<div className="text-red-500 text-sm mt-1">
							{editState.zodErrors.twitterHandle}
						</div>
					)}
				</div>
				<Button className="w-full h-10" disabled={isEditPending} type="submit">
					{isEditPending ? (
						<Loader2 className="w-6 h-6 animate-spin" />
					) : (
						<span className="flex items-center gap-2">
							<SaveIcon className="w-6 h-6" />
							Save
						</span>
					)}
				</Button>
			</form>
		</div>
	);
}
