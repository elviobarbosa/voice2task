import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatDuration, formatDate, minutesUsedThisMonth } from "@/lib/utils";

describe("formatDuration", () => {
  it("shows seconds when under 1 minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("shows minutes when 60 or more seconds", () => {
    expect(formatDuration(90)).toBe("2min");
    expect(formatDuration(60)).toBe("1min");
  });

  it("rounds to nearest minute", () => {
    expect(formatDuration(150)).toBe("3min");
  });
});

describe("formatDate", () => {
  it("returns a non-empty string for valid ISO date", () => {
    const result = formatDate("2025-01-15T10:30:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("minutesUsedThisMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for empty list", () => {
    expect(minutesUsedThisMonth([])).toBe(0);
  });

  it("sums only processings in current month", () => {
    const processings = [
      { duration_seconds: 1800, created_at: "2025-06-10T10:00:00Z" }, // 30 min — this month
      { duration_seconds: 1800, created_at: "2025-06-01T00:00:00Z" }, // 30 min — this month
      { duration_seconds: 3600, created_at: "2025-05-28T10:00:00Z" }, // last month — excluded
    ];
    expect(minutesUsedThisMonth(processings)).toBe(60);
  });

  it("excludes processings from previous months", () => {
    const processings = [
      { duration_seconds: 3600, created_at: "2025-04-01T10:00:00Z" },
      { duration_seconds: 3600, created_at: "2025-05-31T23:59:00Z" },
    ];
    expect(minutesUsedThisMonth(processings)).toBe(0);
  });

  it("rounds result to nearest minute", () => {
    const processings = [
      { duration_seconds: 90, created_at: "2025-06-10T10:00:00Z" },
    ];
    expect(minutesUsedThisMonth(processings)).toBe(2);
  });
});
