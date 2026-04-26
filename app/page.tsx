"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Upload from "./components/Upload";
import Result from "./components/Result";
import { useAuth } from "./components/AuthProvider";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { supabase } from "@/lib/supabase/client";
import { History, Clock, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

type ProcessResult = { tasks: { text: string; deadline: string | null; assignee: string | null; priority: string | null }[]; summary: string };

export default function Home() {
  const t = useTranslations("home");
  const tPaywall = useTranslations("paywall");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [checkoutSuccess, setCheckoutSuccess] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success"
  );
  const { user, signOut } = useAuth();
  const { subscription, isActive, loading: subLoading } = useSubscription();

  const MINUTES_LIMIT = subscription?.minutesLimit ?? 60;

  useEffect(() => {
    if (!checkoutSuccess) return;
    window.history.replaceState({}, "", "/");
    const timer = setTimeout(() => setCheckoutSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            <History className="w-4 h-4" /> {t("history")}
          </Link>
          <button onClick={signOut} className="text-xs text-slate-500 hover:text-slate-300 transition">
            {user?.email} · {t("signOut")}
          </button>
        </div>

        {/* checkout success toast */}
        {checkoutSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
            🎉 {t("subscriptionActive")}
          </div>
        )}

        {/* no-plan banner */}
        {!subLoading && !isActive && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-sm text-indigo-300">
              <Zap className="w-4 h-4" />
              {tPaywall("noPlanTitle")}
            </div>
            <Link
              href="/paywall"
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition"
            >
              {tPaywall("upgradeButton")}
            </Link>
          </div>
        )}

        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
            🎙️ Voice to Tasks
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </header>

        {/* usage meter */}
        <div className="max-w-xl mx-auto w-full space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t("usageThisMonth")}</span>
            <span className={minutesUsed >= MINUTES_LIMIT ? "text-red-400" : ""}>{minutesUsed} / {MINUTES_LIMIT} min</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct >= 100 && (
            <p className="text-xs text-center text-red-400">
              {tPaywall("limitReached")}{" "}
              <Link href="/paywall" className="underline">{tPaywall("upgradeButton")}</Link>
            </p>
          )}
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
                {t("processAnother")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
