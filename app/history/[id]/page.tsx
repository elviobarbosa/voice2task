"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/AuthProvider";
import Result from "@/app/components/Result";
import { Clock, Mic } from "lucide-react";

type Processing = {
  id: string;
  duration_seconds: number;
  result_json: { summary: string; tasks: any[] } | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ProcessingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("processings")
      .select("id, duration_seconds, result_json, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setProcessing(data);
        setLoading(false);
      });
  }, [user, id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (notFound || !processing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Processamento não encontrado.</p>
        <button onClick={() => router.push("/history")} className="text-indigo-400 text-sm">
          ← Voltar ao histórico
        </button>
      </main>
    );
  }

  const durationMin = Math.round(processing.duration_seconds / 60);

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/history")}
            className="text-sm text-slate-500 hover:text-slate-300 transition"
          >
            ← Histórico
          </button>
        </div>

        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <span className="flex items-center gap-1"><Mic className="w-4 h-4" /> {durationMin > 0 ? `${durationMin} min` : `${processing.duration_seconds}s`}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDate(processing.created_at)}</span>
        </div>

        {processing.result_json ? (
          <Result data={processing.result_json} />
        ) : (
          <p className="text-slate-400">Nenhum resultado disponível.</p>
        )}
      </div>
    </main>
  );
}
