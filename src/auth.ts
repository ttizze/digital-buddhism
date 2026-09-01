import { env } from "cloudflare:workers";
import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { customSession, magicLink } from "better-auth/plugins";
import { resolveServerAuthConfig } from "./app/_constants/auth-config.server";
import { BASE_URL } from "./app/_constants/base-url";
import { db } from "./db";
import { sendMagicLinkEmail } from "./utils/send-magic-link-email.server";

const serverAuthConfig = resolveServerAuthConfig(env);

export const auth = betterAuth({
	baseURL: BASE_URL,
	secret: serverAuthConfig.betterAuthSecret,
	plugins: [
		...(serverAuthConfig.magicLinkEnabled
			? [
					magicLink({
						sendMagicLink: async ({ email, token, url }) => {
							await sendMagicLinkEmail(email, url, token);
						},
					}),
				]
			: []),
		customSession(async ({ session }) => {
			const currentUser = await db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", session.userId)
				.executeTakeFirst();

			if (!currentUser) {
				throw new Error("User not found");
			}

			return {
				user: {
					id: currentUser.id,
					name: currentUser.name,
					handle: currentUser.handle,
					plan: currentUser.plan,
					profile: currentUser.profile,
					twitterHandle: currentUser.twitterHandle,
					totalPoints: currentUser.totalPoints,
					isAi: currentUser.isAi,
					image: currentUser.image,
					createdAt: currentUser.createdAt,
					updatedAt: currentUser.updatedAt,
				},
				session,
			};
		}),
	],
	// データベース設定（Kysely を直接使用）
	database: {
		db: db,
		type: "sqlite",
	},
	user: {
		modelName: "users",
		additionalFields: {
			handle: {
				type: "string",
				required: true,
				defaultValue: () => createId(),
			},
		},
	},
	session: {
		modelName: "sessions",
		expiresIn: 60 * 60 * 24 * 7, // 7 days
	},
	account: {
		modelName: "accounts",
	},
	verification: {
		modelName: "verifications",
	},
	advanced: {
		database: {
			generateId: () => {
				return createId();
			},
		},
	},
	socialProviders:
		serverAuthConfig.googleClientId && serverAuthConfig.googleClientSecret
			? {
					google: {
						clientId: serverAuthConfig.googleClientId,
						clientSecret: serverAuthConfig.googleClientSecret,
					},
				}
			: {},
});
