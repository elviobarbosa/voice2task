import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockSelect = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => "/history",
}));

vi.mock("@/app/components/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => mockSelect(),
        }),
      }),
    }),
  },
}));

import HistoryPage from "@/app/history/page";

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner initially", () => {
    mockSelect.mockReturnValue(new Promise(() => {})); // never resolves
    render(<HistoryPage />);
    expect(document.querySelector(".animate-spin")).toBeDefined();
  });

  it("shows empty state when no processings", async () => {
    mockSelect.mockResolvedValueOnce({ data: [] });
    render(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText("Nenhum áudio processado ainda.")).toBeDefined();
    });
  });

  it("renders processing list items", async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        {
          id: "proc-1",
          duration_seconds: 120,
          result_json: { summary: "Reunião de alinhamento", tasks: [{ text: "Enviar relatório" }] },
          created_at: new Date().toISOString(),
        },
        {
          id: "proc-2",
          duration_seconds: 60,
          result_json: { summary: "Nota de voz", tasks: [] },
          created_at: new Date().toISOString(),
        },
      ],
    });
    render(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText("Reunião de alinhamento")).toBeDefined();
      expect(screen.getByText("Nota de voz")).toBeDefined();
    });
  });

  it("shows task count in list items", async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        {
          id: "proc-1",
          duration_seconds: 120,
          result_json: { summary: "Reunião", tasks: [{ text: "t1" }, { text: "t2" }, { text: "t3" }] },
          created_at: new Date().toISOString(),
        },
      ],
    });
    render(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/3 tarefas/)).toBeDefined();
    });
  });

  it("renders usage meter with correct label", async () => {
    mockSelect.mockResolvedValueOnce({ data: [] });
    render(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/Uso este mês/)).toBeDefined();
      expect(screen.getByText("0 / 60 min")).toBeDefined();
    });
  });

  it("calculates minutes used from current month only", async () => {
    const thisMonth = new Date().toISOString();
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    mockSelect.mockResolvedValueOnce({
      data: [
        { id: "1", duration_seconds: 1800, result_json: null, created_at: thisMonth }, // 30 min
        { id: "2", duration_seconds: 1800, result_json: null, created_at: thisMonth }, // 30 min
        { id: "3", duration_seconds: 3600, result_json: null, created_at: lastMonth }, // excluded
      ],
    });
    render(<HistoryPage />);
    await waitFor(() => {
      expect(screen.getByText("60 / 60 min")).toBeDefined();
    });
  });
});
