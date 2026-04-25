export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}min`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function minutesUsedThisMonth(
  processings: { duration_seconds: number; created_at: string }[]
): number {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return Math.round(
    processings
      .filter((p) => new Date(p.created_at) >= startOfMonth)
      .reduce((sum, p) => sum + p.duration_seconds, 0) / 60
  );
}
