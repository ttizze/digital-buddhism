import pino, { type Logger } from "pino";

const resolveCliLogLevel = (): string => {
	if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
	if (process.env.NODE_ENV === "test") return "error";
	return "info";
};

export const createCliLogger = (
	service: string,
	context?: Record<string, unknown>,
): Logger => {
	const logger = pino({
		level: resolveCliLogLevel(),
		name: service,
	});
	return context ? logger.child(context) : logger;
};
