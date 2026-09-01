/**
 * サーバー側専用ロガー
 * TanStack Startのサーバー関数、ルート、APIハンドラーで使用
 *
 * Sentryとの統合が可能
 */

import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import pino, { type Logger } from "pino";

interface LoggerContext {
	requestId?: string;
	userId?: string;
	path?: string;
	[key: string]: unknown;
}

const resolveWorkerLogLevel = (): string => {
	if (env.LOG_LEVEL) return env.LOG_LEVEL;
	if (import.meta.env.MODE === "test") return "error";
	if (import.meta.env.PROD) return "info";
	return "debug";
};

/**
 * サーバー側用のロガーを作成
 * 必要に応じてSentryのコンテキストを設定
 */
export const createServerLogger = (
	service: string,
	context?: LoggerContext,
): Logger => {
	const childLogger = pino({
		level: resolveWorkerLogLevel(),
		name: service,
	});

	// コンテキストをロガーに追加
	const logWithContext = context ? childLogger.child(context) : childLogger;

	// 本番環境でSentryにコンテキストを設定（必要に応じて）
	if (import.meta.env.PROD && context) {
		try {
			Sentry.setContext("request", {
				service,
				...context,
			});
			if (context.userId) {
				Sentry.setUser({ id: context.userId });
			}
			if (context.requestId) {
				Sentry.setTag("requestId", context.requestId);
			}
		} catch {
			// Sentryが初期化されていない場合は無視
		}
	}

	return logWithContext;
};

/**
 * サーバー側のデフォルトロガー
 */
export const serverLogger = createServerLogger("server");
