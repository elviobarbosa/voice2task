"use client";

import { useState } from "react";
import Upload from "./components/Upload";
import Result from "./components/Result";

export default function Home() {
  const [result, setResult] = useState<any>(null);

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">
            🎙️ Voice to Tasks 0.000000000003
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Envie seu áudio e deixe a Inteligência Artificial extrair todas as tarefas, prazos e responsáveis para você.
          </p>
        </header>

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
