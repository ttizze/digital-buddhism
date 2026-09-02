/**
 * サーバー側専用ロガー
 * TanStack Startのサーバー関数、ルート、APIハンドラーで使用
 * 構造化JSONをCloudflare Workers Logsへ出力
 */

import { env } from "cloudflare:workers";
import {
	createStructuredLogger,
	isLogLevel,
	type LogContext,
	type LogLevel,
	type Logger,
} from "./logger-core";

interface LoggerContext extends LogContext {
	requestId?: string;
	userId?: string;
	path?: string;
}

const resolveWorkerLogLevel = (): LogLevel => {
	if (isLogLevel(env.LOG_LEVEL)) return env.LOG_LEVEL;
	if (import.meta.env.MODE === "test") return "error";
	if (import.meta.env.PROD) return "info";
	return "debug";
};

/** サーバー側用のロガーを作成 */
export const createServerLogger = (
	service: string,
	context?: LoggerContext,
): Logger => createStructuredLogger(service, resolveWorkerLogLevel(), context);

/**
 * サーバー側のデフォルトロガー
 */
export const serverLogger = createServerLogger("server");
