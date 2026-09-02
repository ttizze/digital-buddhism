import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useState, useTransition } from "react";
import { authClient } from "@/app/[locale]/_service/auth-client";
import type { SanitizedUser } from "@/app/types";
import { updateProfile } from "@/routes/$locale/-profile-edit-data";
import type { ProfileEditState } from "../_service/profile-edit";
import { notifyEditState } from "./notify-edit-state";

export function useProfileEditForm(currentUser: SanitizedUser, locale: string) {
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

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		if (!formData.has("handle")) formData.set("handle", currentUser.handle);
		if (!formData.has("name")) formData.set("name", currentUser.name);
		if (!formData.has("profile")) {
			formData.set("profile", currentUser.profile || "");
		}
		if (!formData.has("twitterHandle")) {
			formData.set("twitterHandle", currentUser.twitterHandle || "");
		}
		formData.set("locale", locale);

		startEditTransition(() => {
			void (async () => {
				const result = await updateProfileFn({ data: formData });
				setEditState(result);
				notifyEditState(result);
				if (!result.success) return;
				if (result.message) {
					await authClient.updateUser({ name: result.data?.name });
				}
				await router.invalidate({ sync: true });
			})();
		});
	};

	return { editState, handleSubmit, isEditPending };
}
