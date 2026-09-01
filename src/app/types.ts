export type { SanitizedUser } from "@/db/types.helpers";

export type ValidationErrors<U = Record<string, unknown>> = Partial<
	Record<Extract<keyof U, string>, string[]>
>;

type Failure<U = Record<string, unknown>> = {
	success: false;
	message?: string;
	validationErrors?: ValidationErrors<U>;
};

type Success<T = undefined> = {
	success: true;
	data: T;
	message?: string;
};

/** 失敗側（success:false に加えて好きなプロパティを合成） */
export type ActionResponse<T = undefined, U = Record<string, unknown>> =
	| Success<T>
	| Failure<U>;
