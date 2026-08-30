import { env } from "cloudflare:workers";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";

const OG_CACHE_CONTROL =
	"public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
const OG_NOT_FOUND_CACHE_CONTROL =
	"public, max-age=0, s-maxage=60, stale-while-revalidate=600";

async function readOgAsset(
	request: Request,
	assetName: string,
): Promise<ArrayBuffer> {
	const assetResponse = await env.ASSETS.fetch(
		new URL(`/${assetName}`, request.url),
	);
	if (!assetResponse.ok) {
		throw new Error(`Missing OG server asset: ${assetName}`);
	}
	return assetResponse.arrayBuffer();
}

export async function getOgImage(request: Request): Promise<Response> {
	const { searchParams } = new URL(request.url);
	const locale = searchParams.get("locale") || "en";
	const slug = searchParams.get("slug") || "";
	const pageDetail = await fetchPageDetail(slug, locale);

	if (!pageDetail) {
		const response = new ImageResponse(
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					backgroundColor: "#f1f5f9",
				}}
			>
				<p style={{ fontSize: "60px", lineHeight: 1 }}>Page Not Found</p>
			</div>,
			{
				width: 1200,
				height: 630,
			},
		);
		response.headers.set("Cache-Control", OG_NOT_FOUND_CACHE_CONTROL);
		return response;
	}

	const [interFontSemiBold, bizUDPGothicFontBold] = await Promise.all([
		readOgAsset(request, "inter-semi-bold.ttf"),
		readOgAsset(request, "BIZUDPGothic-Bold.ttf"),
	]);
	const response = new ImageResponse(
		<div
			style={{
				fontFamily: "Inter,BIZ UDPGothic",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#000",
				width: "100%",
				height: "100%",
				padding: "24px",
			}}
		>
			<div
				style={{
					backgroundColor: "#f1f5f9",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "flex-start",
					width: "95%",
					height: "95%",
					borderRadius: "12px",
					padding: "40px",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						width: "100%",
					}}
				>
					<p style={{ fontSize: "60px", lineHeight: 1 }}>Tipitaka</p>
				</div>
				<p style={{ fontSize: "60px", lineHeight: 1, marginTop: "56px" }}>
					{pageDetail.title}
				</p>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "Inter",
					data: interFontSemiBold,
					style: "normal",
					weight: 900,
				},
				{
					name: "BIZ UDPGothic",
					data: bizUDPGothicFontBold,
					style: "normal",
					weight: 900,
				},
			],
		},
	);
	response.headers.set("Cache-Control", OG_CACHE_CONTROL);
	return response;
}
