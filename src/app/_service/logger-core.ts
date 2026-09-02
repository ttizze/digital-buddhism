export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogValue =
	| boolean
	| number
	| string
	| null
	| undefined
	| Error
	| Blob
	| readonly LogValue[]
	| LogContext;

export type LogContext = { [key: string]: LogValue };

export type LogMethod = (message: string, context?: LogContext) => void;

export interface Logger {
	debug: LogMethod;
	info: LogMethod;
	warn: LogMethod;
	error: LogMethod;
}

export function isLogLevel(value: string | undefined): value is LogLevel {
	return (
		value === "debug" ||
		value === "info" ||
		value === "warn" ||
		value === "error"
	);
}

function getLogLevelWeight(level: LogLevel): number {
	switch (level) {
		case "debug":
			return 10;
		case "info":
			return 20;
		case "warn":
			return 30;
		case "error":
			return 40;
	}
}

function errorReplacer(_key: string, value: LogValue): LogValue {
	if (!(value instanceof Error)) return value;

	return {
		name: value.name,
		message: value.message,
		stack: value.stack,
		cause:
			value.cause instanceof Error ? value.cause : JSON.stringify(value.cause),
	};
}

interface LogEntry extends LogContext {
	level: LogLevel;
	time: string;
	service: string;
	msg: string;
}

function serializeLogEntry(entry: LogEntry): string {
	try {
		return JSON.stringify(entry, errorReplacer) ?? "";
	} catch {
		return JSON.stringify({
			level: entry.level,
			time: entry.time,
			service: entry.service,
			msg: entry.msg,
		});
	}
}

function writeLog(
	level: LogLevel,
	threshold: LogLevel,
	service: string,
	baseContext: LogContext | undefined,
	message: string,
	callContext: LogContext | undefined,
): void {
	if (getLogLevelWeight(level) < getLogLevelWeight(threshold)) return;

	const entry: LogEntry = {
		...baseContext,
		...callContext,
		level,
		time: new Date().toISOString(),
		service,
		msg: message,
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
		(message, callContext) =>
			writeLog(level, threshold, service, context, message, callContext);

	return {
		debug: createLogMethod("debug"),
		info: createLogMethod("info"),
		warn: createLogMethod("warn"),
		error: createLogMethod("error"),
	};
}
