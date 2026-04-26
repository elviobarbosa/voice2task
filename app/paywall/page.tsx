"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Users, Building2, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { supabase } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

type PlanId = "personal" | "team" | "business";

const PLANS: { id: PlanId; icon: React.ReactNode; name: string; price: string; highlight: boolean }[] = [
  { id: "personal", icon: <Mic className="w-5 h-5" />, name: "Personal", price: "$5.99", highlight: false },
  { id: "team", icon: <Users className="w-5 h-5" />, name: "Team", price: "$19.99", highlight: true },
  { id: "business", icon: <Building2 className="w-5 h-5" />, name: "Business", price: "$49.99", highlight: false },
];

export default function PaywallPage() {
  const t = useTranslations("paywall");
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  const isLimitReached = !!subscription; // has plan but hit limit (came from process error)
  const limitMinutes = subscription?.minutesLimit ?? 60;

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "personal") return; // RevenueCat — handled natively

    setLoading(planId);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorTitle"));
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">

        {/* header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">{isLimitReached ? "⏱️" : "🚀"}</div>
          <h1 className="text-2xl font-bold text-white">
            {isLimitReached ? t("limitTitle") : t("noPlanTitle")}
          </h1>
          <p className="text-sm text-slate-400">
            {isLimitReached
              ? t("limitSubtitle", { limit: limitMinutes })
              : t("noPlanSubtitle")}
          </p>
        </div>

        {/* error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* plans */}
        <div className="space-y-3">
          {PLANS.map((plan) => {
            const isLoading = loading === plan.id;
            const isPersonal = plan.id === "personal";

            return (
              <div
                key={plan.id}
                className={`p-4 rounded-2xl border transition ${
                  plan.highlight
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${plan.highlight ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
                      {plan.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{plan.name}</span>
                        {plan.highlight && (
                          <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">{t("popular")}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {t(`${plan.id}.seats`)} · {t(`${plan.id}.minutes`)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-right">
                      {plan.price}
                      <span className="text-xs text-slate-500">{t("perMonth")}</span>
                    </span>
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={!!loading || isPersonal}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                        isPersonal
                          ? "bg-white/5 text-slate-500 cursor-not-allowed"
                          : plan.highlight
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                          : "bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isPersonal ? (
                        t("comingSoon")
                      ) : (
                        t("subscribe")
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-600">{t("cancelAnytime")}</p>

        {user && (
          <div className="text-center">
            <button
              onClick={() => router.back()}
              className="text-xs text-slate-600 hover:text-slate-400 transition"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
