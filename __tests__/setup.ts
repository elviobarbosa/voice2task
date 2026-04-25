import { vi } from "vitest";

// Mock Capacitor (not available in jsdom)
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    convertFileSrc: (uri: string) => uri,
  },
}));

vi.mock("@capgo/capacitor-share-target", () => ({
  CapacitorShareTarget: {
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

// Mock next/navigation globally
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));
