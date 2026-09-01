import { createContext, useContext } from "react";
import type { AuthProviderAvailability } from "./auth-config.server";

export const AuthProviderAvailabilityContext =
	createContext<AuthProviderAvailability>({ google: false, magicLink: false });

export function useAuthProviderAvailability(): AuthProviderAvailability {
	return useContext(AuthProviderAvailabilityContext);
}
