import { Loader2, SaveIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileEditForm } from "./use-profile-edit-form";

interface ProfileFormProps {
	currentUser: SanitizedUser;
	locale: string;
}

export function ProfileForm({ currentUser, locale }: ProfileFormProps) {
	const t = useTranslations("Profile");
	const { editState, handleSubmit, isEditPending } = useProfileEditForm(
		currentUser,
		locale,
	);

	return (
		<div className="space-y-6">
			<form className="space-y-4" onSubmit={handleSubmit}>
				<div>
					<Label htmlFor="display-name">{t("displayName")}</Label>
					<Input
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={editState.success ? editState.data?.name : ""}
						id="display-name"
						maxLength={25}
						minLength={3}
						name="name"
						required
					/>
					{!editState.success && editState.validationErrors?.name && (
						<div className="text-red-500 text-sm mt-1">
							{editState.validationErrors.name}
						</div>
					)}
				</div>

				<div>
					<Label htmlFor="profile">{t("profile")}</Label>
					<textarea
						className="w-full h-32 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={editState.success ? editState.data?.profile : ""}
						id="profile"
						name="profile"
					/>
					{!editState.success && editState.validationErrors?.profile && (
						<div className="text-red-500 text-sm mt-1">
							{editState.validationErrors.profile}
						</div>
					)}
				</div>
				<div>
					<Label htmlFor="twitter-handle">{t("twitterHandle")}</Label>
					<Input
						className="w-full h-10 px-3 py-2 border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
						defaultValue={
							editState.success ? editState.data?.twitterHandle : ""
						}
						id="twitter-handle"
						name="twitterHandle"
						pattern="@[A-Za-z0-9_]+"
						placeholder={t("twitterPlaceholder")}
					/>
					{!editState.success && editState.validationErrors?.twitterHandle && (
						<div className="text-red-500 text-sm mt-1">
							{editState.validationErrors.twitterHandle}
						</div>
					)}
				</div>
				<Button className="w-full h-10" disabled={isEditPending} type="submit">
					{isEditPending ? (
						<Loader2 className="w-6 h-6 animate-spin" />
					) : (
						<span className="flex items-center gap-2">
							<SaveIcon className="w-6 h-6" />
							{t("save")}
						</span>
					)}
				</Button>
			</form>
		</div>
	);
}
