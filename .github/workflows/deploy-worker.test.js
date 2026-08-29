import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflowPath = resolve(
	process.cwd(),
	".github/workflows/deploy-worker.yaml",
);

async function readWorkflow() {
	const source = await readFile(workflowPath, "utf8");
	return parse(source);
}

function commandStepIndex(steps, command) {
	return steps.findIndex(
		(step) => typeof step.run === "string" && step.run.trim() === command,
	);
}

describe("Workerデプロイworkflowの契約", () => {
	it("mainへのpushだけでWorkerデプロイworkflowを起動する", async () => {
		const workflow = await readWorkflow();

		expect(workflow.on).toEqual({ push: { branches: ["main"] } });
	});

	it("本番デプロイの同時実行を固定グループで制御する", async () => {
		const workflow = await readWorkflow();

		expect(workflow.concurrency).toEqual({
			group: "deploy-worker-production",
			"cancel-in-progress": true,
		});
	});

	it("GitHub Actionsの権限をcontentsのreadだけに制限する", async () => {
		const workflow = await readWorkflow();

		expect(workflow.permissions).toEqual({ contents: "read" });
	});

	it("本番デプロイジョブをubuntu-24.04で15分以内に実行する", async () => {
		const workflow = await readWorkflow();
		const deployJob = workflow.jobs?.deploy;

		expect(deployJob?.["runs-on"]).toBe("ubuntu-24.04");
		expect(deployJob?.["timeout-minutes"]).toBe(15);
	});

	it("checkoutとNixインストーラーを先頭に置き依存関係のインストールより前に実行する", async () => {
		const workflow = await readWorkflow();
		const steps = workflow.jobs?.deploy?.steps ?? [];
		const installIndex = commandStepIndex(
			steps,
			"nix develop --command bun install --frozen-lockfile",
		);

		expect(steps.slice(0, 2).map((step) => step.uses)).toEqual([
			"actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
			"cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24",
		]);
		expect(installIndex).toBeGreaterThanOrEqual(2);
	});

	it("依存関係のインストールをNix環境で行いTIPTAP_PRO_API_KEYをstep環境変数から渡す", async () => {
		const workflow = await readWorkflow();
		const steps = workflow.jobs?.deploy?.steps ?? [];
		const installIndex = commandStepIndex(
			steps,
			"nix develop --command bun install --frozen-lockfile",
		);
		const installStep = steps[installIndex];

		expect(installIndex).toBeGreaterThanOrEqual(0);
		expect(installStep?.env?.TIPTAP_PRO_API_KEY).toBe(
			`\${{ secrets.TIPTAP_PRO_API_KEY }}`,
		);
	});

	it("WorkerのデプロイをNix環境で行いCloudflareの認証情報をstep環境変数から渡す", async () => {
		const workflow = await readWorkflow();
		const steps = workflow.jobs?.deploy?.steps ?? [];
		const installIndex = commandStepIndex(
			steps,
			"nix develop --command bun install --frozen-lockfile",
		);
		const deployIndex = commandStepIndex(
			steps,
			"nix develop --command bun run deploy",
		);
		const deployStep = steps[deployIndex];

		expect(installIndex).toBeGreaterThanOrEqual(0);
		expect(deployIndex).toBeGreaterThanOrEqual(0);
		expect(installIndex).toBeLessThan(deployIndex);
		expect(deployStep?.env?.CLOUDFLARE_API_TOKEN).toBe(
			`\${{ secrets.CLOUDFLARE_API_TOKEN }}`,
		);
		expect(deployStep?.env?.CLOUDFLARE_ACCOUNT_ID).toBe(
			`\${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`,
		);
	});
});
