import "@testing-library/jest-dom";
import { vi } from "vite-plus/test";

vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
	getSession: vi.fn(),
}));
