import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Import after mock is set up
const { getUserFromRequest } = await import("@/lib/supabase/server");

describe("getUserFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("returns null when header is null", async () => {
    const result = await getUserFromRequest(null);
    expect(result).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns null when header lacks Bearer prefix", async () => {
    const result = await getUserFromRequest("invalid-token");
    expect(result).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("calls getUser with token from Bearer header", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } }, error: null });
    const result = await getUserFromRequest("Bearer my-token");
    expect(mockGetUser).toHaveBeenCalledWith("my-token");
    expect(result).toEqual({ id: "user-123" });
  });

  it("returns null when getUser returns an error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("invalid") });
    const result = await getUserFromRequest("Bearer bad-token");
    expect(result).toBeNull();
  });

  it("returns null when user is null", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await getUserFromRequest("Bearer token");
    expect(result).toBeNull();
  });
});
