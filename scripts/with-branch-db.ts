import { spawnSync } from "node:child_process";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "./local-sqlite-db";

function runCommand(commandArgs: string[], env: NodeJS.ProcessEnv): number {
	const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
		stdio: "inherit",
		env,
	});
	if (result.error) {
		console.error(result.error);
		return 1;
	}
	if (result.status !== null) return result.status;
	if (result.signal) {
		console.error(`Command terminated by signal ${result.signal}`);
	}
	return 1;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const shouldSeed = args[0] === "--seed";
	const commandArgs = shouldSeed ? args.slice(args[1] === "--" ? 2 : 1) : args;
	if (commandArgs.length === 0) {
		throw new Error("A command is required");
	}

	const database = await createLocalSqliteDatabase("digital-buddshim-command-");
	const env = buildLocalDatabaseEnv(process.env, database.url);
	let exitCode = 0;

	try {
		if (shouldSeed) {
			exitCode = runCommand(["bun", "run", "tsx", "src/db/seed.ts"], env);
		}
		if (exitCode === 0) {
			exitCode = runCommand(commandArgs, env);
		}
	} finally {
		await database.cleanup();
	}

	process.exitCode = exitCode;
}

const isDirectRun = process.argv[1]?.includes("with-branch-db");
if (isDirectRun) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
