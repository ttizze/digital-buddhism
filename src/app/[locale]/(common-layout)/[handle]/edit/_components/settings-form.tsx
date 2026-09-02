import { Loader2, SaveIcon } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { BASE_URL } from "@/app/_constants/base-url";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileEditForm } from "./use-profile-edit-form";

interface SettingsFormProps {
	currentUser: SanitizedUser;
	locale: string;
}

export function SettingsForm({ currentUser, locale }: SettingsFormProps) {
	const t = useTranslations("Profile");
	const [showHandleInput, setShowHandleInput] = useState(false);
	const { editState, handleSubmit, isEditPending } = useProfileEditForm(
		currentUser,
		locale,
	);

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div className="space-y-4">
				<div>
					<Label className="text-base font-medium mb-2 block" htmlFor="handle">
						{t("handle")}
					</Label>
					<div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
						<div className="flex items-center justify-between">
							<code className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-mono">
								{new URL(BASE_URL).host}/{currentUser.handle}
							</code>
							<Button
								onClick={() => setShowHandleInput(!showHandleInput)}
								type="button"
								variant="outline"
							>
								{showHandleInput ? t("cancel") : t("edit")}
							</Button>
						</div>

						{showHandleInput && (
							<div className="space-y-3">
								<div className="space-y-1 text-sm text-amber-500">
									<p>⚠️ {t("handleWarning")}</p>
									<ul className="list-disc list-inside pl-4 space-y-1">
										<li>{t("handleEffectUpdateUrls")}</li>
										<li>{t("handleEffectBreakLinks")}</li>
										<li>{t("handleEffectReleaseHandle")}</li>
									</ul>
								</div>

								<div className="space-y-2">
									<Label className="text-sm font-medium" htmlFor="handle-input">
										{t("newHandle")}
									</Label>
									<div className="flex items-center gap-2">
										<code className="text-sm text-gray-600 dark:text-gray-400">
											{new URL(BASE_URL).host}/
										</code>
										<Input
											className="flex-1 max-w-[200px]"
											defaultValue={currentUser.handle}
											id="handle-input"
											maxLength={25}
											minLength={3}
											name="handle"
											placeholder={t("handlePlaceholder")}
											required
										/>
									</div>
									{!editState.success && editState.validationErrors?.handle && (
										<p className="text-red-500 text-sm">
											{editState.validationErrors.handle}
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
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
	);
}
