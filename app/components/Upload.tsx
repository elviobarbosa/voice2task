"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { CapacitorShareTarget } from "@capgo/capacitor-share-target";

interface UploadProps {
  onSuccess: (data: any) => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

let pendingShare: any = null;

if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
  CapacitorShareTarget.addListener('shareReceived', async (event: any) => {
    console.log("Share nativo interceptado na raiz!");
    pendingShare = event;
    window.dispatchEvent(new CustomEvent('appShareReceived', { detail: event }));
  });
}

export default function Upload({ onSuccess }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugMessage, setDebugMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  console.log('Upload.tsx carregado');

  const debug = (message: string) => {
    console.log(message);
    setDebugMessage(message);
  };

  const handleProcess = async (fileToProcess?: File) => {
    console.log('handleProcess');
    const targetFile = fileToProcess || file;
    if (!targetFile) {
      setError("Por favor, selecione um arquivo de áudio primeiro.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("audio", targetFile);

    try {
      console.log("Iniciando fetch para /api/process...");
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      console.log("Resposta recebida. Status:", res.status);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar áudio.");
      }

      onSuccess(data);
      // Reset form
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Erro no handleProcess:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const processShare = async (event: any) => {
      console.log("React capturou o share! Verificando evento...");
      try {
        const eventKeys = event ? Object.keys(event).join(", ") : "null";
        console.log(`Evento contém: ${eventKeys}`);
        
        const { files } = event;
        if (files && files.length > 0) {
          const fileData = files[0];
          const fileUri = fileData.uri || fileData.path;
          console.log(`Arquivo: mime=${fileData.mimeType}, uri=${fileUri}`);

          const isAudio = fileData.mimeType?.startsWith('audio/') ||
                          fileUri?.match(/\.(m4a|mp3|wav|ogg|opus|amr)$/i);

          if (isAudio) {
            try {
              const webPath = Capacitor.convertFileSrc(fileUri);
              console.log("webPath:", webPath);
              const response = await fetch(webPath);
              if (!response.ok) throw new Error(`fetch falhou: ${response.status}`);
              const blob = await response.blob();

              const newFile = new File([blob], fileData.name || "audio_compartilhado", {
                type: fileData.mimeType || blob.type || "audio/m4a"
              });

              setFile(newFile);
              setError("");
              console.log("Iniciando auto-processamento...");
              handleProcess(newFile);

            } catch (err: any) {
              console.error("Erro no share:", err.message);
              setError("Erro ao carregar o arquivo compartilhado: " + err.message);
            }
          } else {
            console.warn("Não é áudio:", fileData.mimeType);
            setError("O arquivo compartilhado não é um áudio suportado.");
          }
        } else {
          alert("Nenhum arquivo na propriedade 'files'.");
        }
      } catch (err: any) {
         alert("Erro geral no processShare: " + err.message);
      }
      pendingShare = null;
    };

    if (pendingShare) {
      processShare(pendingShare);
    }

    const handleShare = (e: any) => processShare(e.detail);
    window.addEventListener('appShareReceived', handleShare as EventListener);
    
    return () => {
      window.removeEventListener('appShareReceived', handleShare as EventListener);
    };
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    console.log("handleFileSelect chamado", files);
    setError("");
    const selectedFile = files?.[0];

    if (selectedFile) {
      console.log("Arquivo selecionado:", selectedFile.name, selectedFile.type, selectedFile.size);
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("O arquivo é muito grande. O limite máximo é 15MB.");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
      debug(`Arquivo selecionado: ${selectedFile.name} (${selectedFile.type || 'sem tipo'}) ${selectedFile.size} bytes`);
      handleProcess(selectedFile);
    } else {
      debug("Nenhum arquivo selecionado após o diálogo de arquivo.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="relative mb-6">
        <input
          type="file"
          id="audio-upload"
          accept="audio/*"
          ref={fileInputRef}
          onClick={() => debug("input de arquivo clicado")}
          onInput={(e) => handleFileSelect((e.target as HTMLInputElement).files)}
          onChange={handleFileChange}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        <div
          onClick={() => {
            if (!loading) {
              debug('Card de upload clicado');
              fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 bg-white/5 group-hover:border-indigo-400'} cursor-pointer`}
        >
          <UploadCloud className={`w-10 h-10 mb-3 ${file ? 'text-indigo-400' : 'text-slate-400'}`} />
          <p className="text-center text-slate-300 font-medium">
            {file ? file.name : "Selecione ou arraste um arquivo de áudio"}
          </p>
          <p className="text-xs text-slate-500 mt-2">MP3, WAV, M4A, OGG, OPUS (Máx. 15MB)</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              debug('Botão Selecionar Áudio clicado');
              fileInputRef.current?.click();
            }}
            className="mt-4 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-500"
          >
            Selecionar áudio manualmente
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {debugMessage ? (
        <div className="mb-4 p-4 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm">
          <strong>Debug:</strong> {debugMessage}
        </div>
      ) : null}

      <button
        onClick={handleProcess}
        disabled={!file || loading}
        className="w-full py-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando com IA...
          </>
        ) : (
          "✨ Processar Áudio"
        )}
      </button>
    </div>
  );
}
