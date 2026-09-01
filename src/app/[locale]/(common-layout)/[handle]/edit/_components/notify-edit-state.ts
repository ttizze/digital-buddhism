import { toast } from "sonner";
import type { ProfileEditState } from "../_service/profile-edit";

/** 編集結果をトーストで通知する（成功メッセージ or 最初のバリデーションエラー） */
export function notifyEditState(state: ProfileEditState): void {
	if (state.success) {
		if (state.message) toast.success(state.message);
		return;
	}
	const errorMessage =
		state.validationErrors?.handle?.[0] ??
		state.validationErrors?.name?.[0] ??
		state.validationErrors?.profile?.[0] ??
		state.validationErrors?.twitterHandle?.[0] ??
		state.message;
	if (errorMessage) toast.error(errorMessage);
}
