"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Upload from "./components/Upload";
import Result from "./components/Result";
import { useAuth } from "./components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { History, Clock } from "lucide-react";

const MINUTES_LIMIT = 60;

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    supabase
      .from("processings")
      .select("duration_seconds")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString())
      .then(({ data }) => {
        const total = (data ?? []).reduce((s, p) => s + p.duration_seconds, 0);
        setMinutesUsed(Math.round(total / 60));
      });
  }, [user, result]);

  const pct = Math.min((minutesUsed / MINUTES_LIMIT) * 100, 100);

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/history"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition"
          >
            <History className="w-4 h-4" /> Histórico
          </Link>
          <button onClick={signOut} className="text-xs text-slate-500 hover:text-slate-300 transition">
            {user?.email} · Sair
          </button>
        </div>

        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
            🎙️ Voice to Tasks
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Envie seu áudio e deixe a Inteligência Artificial extrair todas as tarefas, prazos e responsáveis para você.
          </p>
        </header>

        {/* usage meter */}
        <div className="max-w-xl mx-auto w-full space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Uso este mês</span>
            <span className={minutesUsed >= MINUTES_LIMIT ? "text-red-400" : ""}>{minutesUsed} / {MINUTES_LIMIT} min</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {!result ? (
          <Upload onSuccess={setResult} />
        ) : (
          <div className="space-y-8">
            <Result data={result} />
            <div className="flex justify-center">
              <button
                onClick={() => setResult(null)}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors underline underline-offset-4"
              >
                Processar outro áudio
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
