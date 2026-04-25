import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUserFromRequest = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase/server", () => ({
  getUserFromRequest: mockGetUserFromRequest,
  createServerClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/openai", () => ({
  default: {
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({ text: "Precisa entregar o relatório amanhã." }),
      },
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"tasks":[{"text":"Entregar relatório","deadline":"amanhã","assignee":null,"priority":"Alta"}],"summary":"Entrega de relatório"}' } }],
        }),
      },
    },
  },
}));

vi.mock("openai", () => ({
  toFile: vi.fn(async (buffer: Buffer, name: string, opts: any) => ({ buffer, name, ...opts })),
}));

const { POST } = await import("@/app/api/process/route");

function makeRequest(headers: Record<string, string> = {}, body?: FormData) {
  return new NextRequest("http://localhost/api/process", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    mockGetUserFromRequest.mockResolvedValueOnce(null);
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 401 when token is invalid", async () => {
    mockGetUserFromRequest.mockResolvedValueOnce(null);
    const req = makeRequest({ authorization: "Bearer invalid" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no audio file", async () => {
    mockGetUserFromRequest.mockResolvedValueOnce({ id: "user-123" });
    const formData = new FormData();
    const req = makeRequest({ authorization: "Bearer valid" }, formData);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("arquivo");
  });

  it("returns 400 when file exceeds 15MB", async () => {
    mockGetUserFromRequest.mockResolvedValueOnce({ id: "user-123" });
    class BigFile extends File {
      get size() { return 16 * 1024 * 1024; }
    }
    const bigFile = new BigFile(["x"], "big.mp3", { type: "audio/mp3" });
    const formData = new FormData();
    formData.append("audio", bigFile);

    const req = makeRequest({ authorization: "Bearer valid" });
    vi.spyOn(req, "formData").mockResolvedValueOnce(formData);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("15MB");
  });

  it("returns extracted tasks for valid request", async () => {
    mockGetUserFromRequest.mockResolvedValueOnce({ id: "user-123" });
    const formData = new FormData();
    const file = new File([new ArrayBuffer(1000)], "audio.ogg", { type: "audio/ogg" });
    formData.append("audio", file);
    const req = makeRequest({ authorization: "Bearer valid" }, formData);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(1);
    expect(body.summary).toBe("Entrega de relatório");
  });
});
