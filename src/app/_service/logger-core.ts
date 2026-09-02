export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LogMethod = (
	contextOrMessage: LogContext | string,
	message?: string,
) => void;

export type Logger = Record<LogLevel, LogMethod>;

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

export function isLogLevel(value: string | undefined): value is LogLevel {
	return (
		value === "debug" ||
		value === "info" ||
		value === "warn" ||
		value === "error"
	);
}

function errorReplacer(_key: string, value: unknown): unknown {
	if (!(value instanceof Error)) return value;

	return {
		name: value.name,
		message: value.message,
		...(value.stack ? { stack: value.stack } : {}),
		...(value.cause !== undefined ? { cause: value.cause } : {}),
	};
}

function serializeLogEntry(entry: LogContext): string {
	try {
		return JSON.stringify(entry, errorReplacer) ?? "";
	} catch {
		return (
			JSON.stringify({
				level: entry.level,
				time: entry.time,
				service: entry.service,
				...(typeof entry.msg === "string" ? { msg: entry.msg } : {}),
			}) ?? ""
		);
	}
}

function writeLog(
	level: LogLevel,
	threshold: LogLevel,
	service: string,
	baseContext: LogContext | undefined,
	contextOrMessage: LogContext | string,
	message: string | undefined,
): void {
	if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[threshold]) return;

	const callContext =
		typeof contextOrMessage === "string" ? undefined : contextOrMessage;
	const msg = typeof contextOrMessage === "string" ? contextOrMessage : message;
	const entry: LogContext = {
		...baseContext,
		...callContext,
		level,
		time: new Date().toISOString(),
		service,
		...(msg !== undefined ? { msg } : {}),
	};

	console[level](serializeLogEntry(entry));
}

export function createStructuredLogger(
	service: string,
	threshold: LogLevel,
	context?: LogContext,
): Logger {
	const createLogMethod =
		(level: LogLevel): LogMethod =>
		(contextOrMessage, message) =>
			writeLog(level, threshold, service, context, contextOrMessage, message);

	return {
		debug: createLogMethod("debug"),
		info: createLogMethod("info"),
		warn: createLogMethod("warn"),
		error: createLogMethod("error"),
	};
}
