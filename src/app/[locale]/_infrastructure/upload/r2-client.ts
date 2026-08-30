import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const isProduction = process.env.NODE_ENV === "production";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "tipitaka";
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

const s3Client = new S3Client(
	isProduction
		? {
				region: "us-east-1",
				endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				credentials: {
					accessKeyId: R2_ACCESS_KEY_ID ?? "",
					secretAccessKey: R2_SECRET_ACCESS_KEY ?? "",
				},
			}
		: {
				region: "us-east-1",
				endpoint: "http://localhost:9000",
				credentials: {
					accessKeyId: "minioadmin",
					secretAccessKey: "minioadmin",
				},
				forcePathStyle: true,
			},
);

export async function uploadToR2(file: File): Promise<string> {
	const publicBaseUrl = isProduction ? R2_PUBLIC_BASE_URL : undefined;
	if (isProduction && !publicBaseUrl) {
		throw new Error("R2_PUBLIC_BASE_URL is not defined");
	}
	const key = `uploads/${Date.now()}-${randomUUID()}`;
	const arrayBuffer = await file.arrayBuffer();

	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: key,
		Body: Buffer.from(arrayBuffer),
		ContentType: file.type,
	});

	await s3Client.send(command);
	if (!publicBaseUrl) {
		return `http://localhost:9000/${R2_BUCKET_NAME}/${key}`;
	}
	return new URL(key, `${publicBaseUrl.replace(/\/$/, "")}/`).toString();
}
