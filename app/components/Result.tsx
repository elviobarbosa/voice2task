"use client";

import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface Task {
  text: string;
  deadline: string | null;
  assignee: string | null;
  priority: string | null;
}

interface ResultProps {
  data: {
    summary: string;
    tasks: Task[];
  };
}

export default function Result({ data }: ResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const textToCopy = [
        "RESUMO:",
        data.summary,
        "",
        "TAREFAS:",
        ...data.tasks.map((t, i) => {
          let line = `${i + 1}. ${t.text}`;
          if (t.priority) line += ` [Prioridade: ${t.priority}]`;
          if (t.deadline) line += ` [Prazo: ${t.deadline}]`;
          if (t.assignee) line += ` [Resp: ${t.assignee}]`;
          return line;
        })
      ].join("\n");

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors border border-white/10"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiado!" : "Copiar tudo"}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <h2 className="text-xl font-semibold mb-3 text-white">Resumo</h2>
        <p className="text-slate-300 leading-relaxed">{data.summary || "Nenhum resumo."}</p>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <h2 className="text-xl font-semibold mb-4 text-white">Tarefas Extraídas</h2>
        
        {data.tasks && data.tasks.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {data.tasks.map((task, idx) => (
              <li key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-lg font-medium text-slate-100 mb-3">{task.text}</div>
                <div className="flex flex-wrap gap-2">
                  {task.priority && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      /alta|high/i.test(task.priority) ? 'bg-red-500/20 text-red-300 border border-red-500/20' :
                      /média|medium/i.test(task.priority) ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      Prioridade: {task.priority}
                    </span>
                  )}
                  {task.deadline && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-white/10">
                      ⏰ {task.deadline}
                    </span>
                  )}
                  {task.assignee && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                      👤 {task.assignee}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400">Nenhuma tarefa identificada.</p>
        )}
      </div>
    </div>
  );
}
