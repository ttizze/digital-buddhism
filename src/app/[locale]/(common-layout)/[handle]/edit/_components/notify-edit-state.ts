import { toast } from "sonner";
import type { ProfileEditState } from "../_service/profile-edit";

/** 編集結果をトーストで通知する（成功メッセージ or 最初のバリデーションエラー） */
export function notifyEditState(state: ProfileEditState): void {
	if (state.success) {
		if (state.message) toast.success(state.message);
		return;
	}
	const errorMessage =
		state.zodErrors?.handle?.[0] ??
		state.zodErrors?.name?.[0] ??
		state.zodErrors?.profile?.[0] ??
		state.zodErrors?.twitterHandle?.[0] ??
		state.message;
	if (errorMessage) toast.error(errorMessage);
}
