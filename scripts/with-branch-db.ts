import { spawnSync } from "node:child_process";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "./local-sqlite-db";

async function main(): Promise<void> {
	const commandArgs = process.argv.slice(2);
	if (commandArgs.length === 0) {
		throw new Error("A command is required");
	}

	const database = await createLocalSqliteDatabase("digital-buddshim-command-");
	let exitCode = 0;

	try {
		const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
			stdio: "inherit",
			env: buildLocalDatabaseEnv(process.env, database.url),
		});
		if (result.error) {
			console.error(result.error);
			exitCode = 1;
		} else if (result.status === null) {
			if (result.signal) {
				console.error(`Command terminated by signal ${result.signal}`);
			}
			exitCode = 1;
		} else {
			exitCode = result.status;
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
