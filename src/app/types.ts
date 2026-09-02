export type { SanitizedUser } from "@/db/types.helpers";

type ValidationErrors<U extends object = object> = Partial<
	Record<Extract<keyof U, string>, string[]>
>;

type Failure<U extends object = object> = {
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
export type ActionResponse<T = undefined, U extends object = object> =
	| Success<T>
	| Failure<U>;
