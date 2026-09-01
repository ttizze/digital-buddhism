interface ServerAuthEnvironment {
	AUTH_GOOGLE_ID?: string;
	AUTH_GOOGLE_SECRET?: string;
	AUTH_RESEND_KEY?: string;
	BETTER_AUTH_SECRET?: string;
}

interface ServerAuthConfig {
	betterAuthSecret: string;
	googleClientId: string | null;
	googleClientSecret: string | null;
	magicLinkEnabled: boolean;
}

export interface AuthProviderAvailability {
	google: boolean;
	magicLink: boolean;
}

function resolveGoogleCredentials(env: ServerAuthEnvironment) {
	const googleClientId = env.AUTH_GOOGLE_ID?.trim() || null;
	const googleClientSecret = env.AUTH_GOOGLE_SECRET?.trim() || null;
	if ((googleClientId === null) !== (googleClientSecret === null)) {
		throw new Error(
			"AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be configured together",
		);
	}
	return { googleClientId, googleClientSecret };
}

export function resolveAuthProviderAvailability(
	env: ServerAuthEnvironment,
): AuthProviderAvailability {
	const { googleClientId } = resolveGoogleCredentials(env);
	return {
		google: googleClientId !== null,
		magicLink: Boolean(env.AUTH_RESEND_KEY?.trim()),
	};
}

export function resolveServerAuthConfig(
	env: ServerAuthEnvironment,
): ServerAuthConfig {
	const betterAuthSecret = env.BETTER_AUTH_SECRET?.trim();
	if (!betterAuthSecret || betterAuthSecret.length < 32) {
		throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
	}
	const { googleClientId, googleClientSecret } = resolveGoogleCredentials(env);

	return {
		betterAuthSecret,
		googleClientId,
		googleClientSecret,
		magicLinkEnabled: Boolean(env.AUTH_RESEND_KEY?.trim()),
	};
}
