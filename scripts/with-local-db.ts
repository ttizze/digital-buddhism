import { type ChildProcess, spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { buildLocalDatabaseEnv } from "./local-sqlite-db";
import { openMigratedTursoDatabase } from "./turso-migrations";

const LOCAL_BASE_URL = "http://localhost:3000";
const LOCAL_AUTH_SECRET = "digital-buddshim-local-development-secret";
export const LOCAL_DATABASE_URL = "http://127.0.0.1:18080";

const wait = (milliseconds: number) =>
	new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

export function resolveLocalDatabaseUrl(baseEnv: NodeJS.ProcessEnv): string {
	const configuredUrl = baseEnv.TURSO_DATABASE_URL?.trim();
	if (!configuredUrl) return LOCAL_DATABASE_URL;

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(configuredUrl);
	} catch (error) {
		throw new Error("TURSO_DATABASE_URL must be a valid URL", { cause: error });
	}

	const isLoopback =
		parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";
	if (
		parsedUrl.protocol !== "http:" ||
		!isLoopback ||
		parsedUrl.port !== "18080"
	) {
		throw new Error(
			"Local commands only accept the managed libSQL server at http://127.0.0.1:18080",
		);
	}

	return LOCAL_DATABASE_URL;
}

export function resolveLocalDatabaseDirectory(cwd = process.cwd()): string {
	return resolve(cwd, ".data", "digital-buddshim.sqld");
}

export function buildLocalCommandEnv(
	baseEnv: NodeJS.ProcessEnv,
	databaseUrl: string,
): NodeJS.ProcessEnv {
	return {
		...buildLocalDatabaseEnv(baseEnv, databaseUrl),
		BETTER_AUTH_SECRET: baseEnv.BETTER_AUTH_SECRET?.trim() || LOCAL_AUTH_SECRET,
		VITE_PUBLIC_DOMAIN: baseEnv.VITE_PUBLIC_DOMAIN?.trim() || LOCAL_BASE_URL,
	};
}

async function isLocalDatabaseReady(databaseUrl: string): Promise<boolean> {
	try {
		const response = await fetch(`${databaseUrl}/version`, {
			signal: AbortSignal.timeout(500),
		});
		return response.ok;
	} catch {
		return false;
	}
}

async function startLocalDatabase(
	databaseDirectory: string,
	databaseUrl: string,
): Promise<ChildProcess | undefined> {
	if (await isLocalDatabaseReady(databaseUrl)) return undefined;

	await mkdir(databaseDirectory, { recursive: true });
	const databaseProcess = spawn(
		"sqld",
		[
			"--db-path",
			databaseDirectory,
			"--http-listen-addr",
			"127.0.0.1:18080",
			"--max-response-size",
			"128MB",
			"--max-total-response-size",
			"256MB",
			"--no-welcome",
		],
		{ stdio: "inherit" },
	);

	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (await isLocalDatabaseReady(databaseUrl)) {
			return databaseProcess.exitCode === null ? databaseProcess : undefined;
		}
		if (databaseProcess.exitCode !== null) break;
		await wait(50);
	}

	if (databaseProcess.exitCode === null) databaseProcess.kill("SIGTERM");
	throw new Error(`Local libSQL server did not start at ${databaseUrl}`);
}

async function stopLocalDatabase(
	databaseProcess?: ChildProcess,
): Promise<void> {
	if (!databaseProcess || databaseProcess.exitCode !== null) return;

	databaseProcess.kill("SIGTERM");
	await Promise.race([
		new Promise<void>((resolveExit) =>
			databaseProcess.once("exit", () => resolveExit()),
		),
		wait(3_000),
	]);
	if (databaseProcess.exitCode === null) databaseProcess.kill("SIGKILL");
}

async function runCommand(
	commandArgs: string[],
	env: NodeJS.ProcessEnv,
): Promise<number> {
	const command = spawn(commandArgs[0], commandArgs.slice(1), {
		stdio: "inherit",
		env,
	});

	const forwardSignal = (signal: NodeJS.Signals) => command.kill(signal);
	const forwardInterrupt = () => forwardSignal("SIGINT");
	const forwardTermination = () => forwardSignal("SIGTERM");
	process.once("SIGINT", forwardInterrupt);
	process.once("SIGTERM", forwardTermination);

	try {
		return await new Promise<number>((resolveExit, rejectExit) => {
			command.once("error", rejectExit);
			command.once("exit", (code) => resolveExit(code ?? 1));
		});
	} finally {
		process.off("SIGINT", forwardInterrupt);
		process.off("SIGTERM", forwardTermination);
	}
}

async function main(): Promise<void> {
	const inputArgs = process.argv.slice(2);
	const skipMigrations = inputArgs[0] === "--skip-migrations";
	const commandArgs = skipMigrations ? inputArgs.slice(1) : inputArgs;
	if (commandArgs.length === 0) throw new Error("A command is required");

	const databaseUrl = resolveLocalDatabaseUrl(process.env);
	const databaseDirectory = resolveLocalDatabaseDirectory();
	const databaseProcess = await startLocalDatabase(
		databaseDirectory,
		databaseUrl,
	);

	try {
		if (!skipMigrations) {
			const client = await openMigratedTursoDatabase(databaseUrl);
			client.close();
		}
		process.exitCode = await runCommand(
			commandArgs,
			buildLocalCommandEnv(process.env, databaseUrl),
		);
	} finally {
		await stopLocalDatabase(databaseProcess);
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
