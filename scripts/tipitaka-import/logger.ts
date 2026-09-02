import {
	createStructuredLogger,
	isLogLevel,
	type LogContext,
	type LogLevel,
	type Logger,
} from "@/app/_service/logger-core";

const resolveCliLogLevel = (): LogLevel => {
	if (isLogLevel(process.env.LOG_LEVEL)) return process.env.LOG_LEVEL;
	if (process.env.NODE_ENV === "test") return "error";
	return "info";
};

export const createCliLogger = (
	service: string,
	context?: LogContext,
): Logger => {
	return createStructuredLogger(service, resolveCliLogLevel(), context);
};
