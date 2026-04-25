import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockSignInWithPassword, mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/auth/login",
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  },
}));

import LoginPage from "@/app/auth/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email, password fields and login button", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("voce@email.com")).toBeDefined();
    expect(screen.getByPlaceholderText("••••••••")).toBeDefined();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeDefined();
  });

  it("renders Google and Facebook OAuth buttons", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /continuar com facebook/i })).toBeDefined();
  });

  it("shows link to signup page", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: /criar conta/i })).toBeDefined();
  });

  it("shows link to forgot password", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: /esqueceu a senha/i })).toBeDefined();
  });

  it("calls signInWithPassword with email and password", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("voce@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByPlaceholderText("voce@email.com").closest("form")!);
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "password123",
      });
    });
  });

  it("displays error message on failed login", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid credentials" } });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("voce@email.com"), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrongpass" },
    });
    fireEvent.submit(screen.getByPlaceholderText("voce@email.com").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeDefined();
    });
  });

  it("triggers Google OAuth on button click", async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /continuar com google/i }));
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" })
      );
    });
  });
});
