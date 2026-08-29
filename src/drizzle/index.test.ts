import { describe, expect, it } from "vitest";
import { db as kyselyDb } from "@/db";
import {
	getDatabaseClient,
	runWithDatabaseRequestContext,
} from "@/db/request-context";
import { db as drizzleDb } from "./index";

describe("DrizzleのTurso接続", () => {
	it("Kyselyと同じrequest clientを共有し終了時にcloseする", async () => {
		let client: ReturnType<typeof getDatabaseClient> | undefined;

		await runWithDatabaseRequestContext(
			{ url: "file::memory:", authToken: undefined },
			() => {
				client = getDatabaseClient();
				expect(kyselyDb.client).toBe(client);
				expect(drizzleDb.$client).toBe(client);
			},
		);

		expect(client?.closed).toBe(true);
	});
});
