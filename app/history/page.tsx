"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/AuthProvider";
import { formatDuration, formatDate, minutesUsedThisMonth } from "@/lib/utils";
import { ChevronRight, Clock, Mic } from "lucide-react";

type Processing = {
  id: string;
  duration_seconds: number;
  result_json: { summary: string; tasks: { text: string }[] } | null;
  created_at: string;
};

export default function HistoryPage() {
  const [processings, setProcessings] = useState<Processing[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("processings")
      .select("id, duration_seconds, result_json, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProcessings(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const minutesUsed = minutesUsedThisMonth(processings);
  const minutesLimit = 60;

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Histórico</h1>
          <button
            onClick={() => router.back()}
            className="text-sm text-slate-500 hover:text-slate-300 transition"
          >
            ← Voltar
          </button>
        </div>

        {/* usage meter */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Uso este mês
            </span>
            <span className="text-white font-medium">{minutesUsed} / {minutesLimit} min</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                minutesUsed >= minutesLimit ? "bg-red-500" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min((minutesUsed / minutesLimit) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : processings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <Mic className="w-12 h-12 text-slate-700" />
            <p className="text-slate-400">Nenhum áudio processado ainda.</p>
            <button
              onClick={() => router.push("/")}
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Processar primeiro áudio →
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {processings.map((p) => {
              const taskCount = p.result_json?.tasks?.length ?? 0;
              const preview = p.result_json?.summary ?? p.result_json?.tasks?.[0]?.text ?? "Sem resumo";
              return (
                <li key={p.id}>
                  <Link
                    href={`/history/${p.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition group"
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{preview}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {taskCount} tarefa{taskCount !== 1 ? "s" : ""} · {formatDuration(p.duration_seconds)} · {formatDate(p.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
