import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockReplace = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockRefreshProfile = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/onboarding",
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: () => ({ update: mockUpdate }),
  },
}));

vi.mock("@/app/components/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "user-123" }, refreshProfile: mockRefreshProfile }),
}));

import OnboardingPage from "@/app/onboarding/page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders first screen content", () => {
    render(<OnboardingPage />);
    expect(screen.getByText("Voz vira tarefas")).toBeDefined();
  });

  it("advances to next screen on Próximo click", () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByText("Funciona em qualquer situação")).toBeDefined();
  });

  it("goes back on Voltar click", () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByText("Voz vira tarefas")).toBeDefined();
  });

  it("does not show Voltar on first screen", () => {
    render(<OnboardingPage />);
    expect(screen.queryByRole("button", { name: /voltar/i })).toBeNull();
  });

  it("shows Ver planos button on last content screen", () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByRole("button", { name: /ver planos/i })).toBeDefined();
  });

  it("shows plan selection screen after all content screens", () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /ver planos/i }));
    expect(screen.getByText("Escolha seu plano")).toBeDefined();
    expect(screen.getByText("Personal")).toBeDefined();
    expect(screen.getByText("Team")).toBeDefined();
    expect(screen.getByText("Business")).toBeDefined();
  });

  it("marks onboarding complete and redirects on Começar", async () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    fireEvent.click(screen.getByRole("button", { name: /ver planos/i }));
    fireEvent.click(screen.getByRole("button", { name: /começar/i }));
    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ onboarding_completed: true });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });
});
