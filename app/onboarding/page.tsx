"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/AuthProvider";
import { ChevronRight, Mic, Users, Building2, Check } from "lucide-react";

const SCREENS = [
  {
    id: 1,
    emoji: "🎙️",
    title: "Voz vira tarefas",
    titleEn: "Voice becomes tasks",
    body: "Grave ou compartilhe qualquer áudio. A IA extrai todas as tarefas, prazos e responsáveis automaticamente.",
    bodyEn: "Record or share any audio. AI extracts all tasks, deadlines, and owners automatically.",
  },
  {
    id: 2,
    emoji: "⚡",
    title: "Funciona em qualquer situação",
    titleEn: "Works everywhere",
    body: "Reuniões, recados de voz, ligações, notas pessoais — qualquer áudio se torna uma lista de ações.",
    bodyEn: "Meetings, voice memos, calls, personal notes — any audio becomes an action list.",
  },
  {
    id: 3,
    emoji: "👥",
    title: "Compartilhe com seu time",
    titleEn: "Share with your team",
    body: "Adicione membros ao seu plano. Todos acessam o histórico e as tarefas extraídas em um só lugar.",
    bodyEn: "Add members to your plan. Everyone accesses history and extracted tasks in one place.",
  },
];

const PLANS = [
  {
    id: "personal",
    icon: <Mic className="w-5 h-5" />,
    name: "Personal",
    price: "$5.99",
    seats: "1 usuário",
    minutes: "60 min/mês",
    highlight: false,
  },
  {
    id: "team",
    icon: <Users className="w-5 h-5" />,
    name: "Team",
    price: "$19.99",
    seats: "5 usuários",
    minutes: "60 min/usuário",
    highlight: true,
  },
  {
    id: "business",
    icon: <Building2 className="w-5 h-5" />,
    name: "Business",
    price: "$49.99",
    seats: "15 usuários",
    minutes: "60 min/usuário",
    highlight: false,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0); // 0-2 = screens, 3 = plans
  const [saving, setSaving] = useState(false);
  const { user, refreshProfile } = useAuth();
  const router = useRouter();

  const isLastContent = step === SCREENS.length - 1;
  const isPlans = step === SCREENS.length;

  const handleNext = () => {
    if (!isPlans) { setStep((s) => s + 1); return; }
    handleComplete();
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    await refreshProfile();
    router.replace("/");
  };

  return (
    <main className="min-h-screen flex flex-col px-6 py-12">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">

        {/* progress dots */}
        <div className="flex justify-center gap-2 mb-12">
          {[...SCREENS, { id: "plans" }].map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-indigo-500" : i < step ? "w-4 bg-indigo-800" : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* content screens */}
        {!isPlans && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="text-7xl">{SCREENS[step].emoji}</div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-white">{SCREENS[step].title}</h1>
              <p className="text-sm text-slate-400 leading-relaxed">{SCREENS[step].body}</p>
              <p className="text-xs text-slate-600 italic">{SCREENS[step].bodyEn}</p>
            </div>
          </div>
        )}

        {/* plans screen */}
        {isPlans && (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="text-center space-y-2 mb-2">
              <h1 className="text-2xl font-bold text-white">Escolha seu plano</h1>
              <p className="text-sm text-slate-400">Cancele quando quiser. Sem compromisso.</p>
            </div>

            {PLANS.map((plan) => (
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
                          <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">Popular</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{plan.seats} · {plan.minutes}</p>
                    </div>
                  </div>
                  <span className="font-bold text-white">{plan.price}<span className="text-xs text-slate-500">/mês</span></span>
                </div>
              </div>
            ))}

            <p className="text-center text-xs text-slate-600 pt-2">
              Você poderá assinar após explorar o app.
            </p>
          </div>
        )}

        {/* navigation */}
        <div className="pt-8 space-y-3">
          <button
            onClick={handleNext}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : isPlans ? (
              <><Check className="w-5 h-5" /> Começar</>
            ) : (
              <><ChevronRight className="w-5 h-5" /> {isLastContent ? "Ver planos" : "Próximo"}</>
            )}
          </button>

          {step > 0 && !saving && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
