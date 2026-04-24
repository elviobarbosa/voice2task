"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { CapacitorShareTarget } from "@capgo/capacitor-share-target";

interface UploadProps {
  onSuccess: (data: any) => void;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

let pendingShare: any = null;

if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
  CapacitorShareTarget.addListener('shareReceived', async (event: any) => {
    alert("Share nativo interceptado na raiz!"); // DEBUG
    pendingShare = event;
    window.dispatchEvent(new CustomEvent('appShareReceived', { detail: event }));
  });
}

export default function Upload({ onSuccess }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async (fileToProcess?: File) => {
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
      // Se você quiser apontar para a Vercel, pode trocar a URL abaixo temporariamente
      // para const res = await fetch("https://sua-url-na-vercel.app/api/process", ...)
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar áudio.");
      }

      onSuccess(data);
      // Reset form
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const processShare = async (event: any) => {
      // Removemos os alerts de DEBUG para não poluir a tela
      const { files } = event;
      if (files && files.length > 0) {
        const fileData = files[0];
        const isAudio = fileData.mimeType?.startsWith('audio/') || 
                        fileData.path?.match(/\.(m4a|mp3|wav|ogg|opus|amr)$/i);
        
        if (isAudio) {
          try {
            const contents = await Filesystem.readFile({
              path: fileData.path
            });
            
            const base64Data = contents.data as string;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: fileData.mimeType || "audio/m4a" });
            
            const newFile = new File([blob], fileData.name || "audio_compartilhado", { 
              type: blob.type 
            });
            
            setFile(newFile);
            setError("");
            
            // 🔥 AUTO-PROCESSAR assim que carregar o arquivo
            handleProcess(newFile);

          } catch (err: any) {
            setError("Erro ao carregar o arquivo compartilhado: " + err.message);
          }
        } else {
          setError("O arquivo compartilhado não é um áudio suportado.");
        }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("O arquivo é muito grande. O limite máximo é 15MB.");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="relative mb-6">
        <input
          type="file"
          id="audio-upload"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={loading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        <div className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 bg-white/5 group-hover:border-indigo-400'}`}>
          <UploadCloud className={`w-10 h-10 mb-3 ${file ? 'text-indigo-400' : 'text-slate-400'}`} />
          <p className="text-center text-slate-300 font-medium">
            {file ? file.name : "Selecione ou arraste um arquivo de áudio"}
          </p>
          <p className="text-xs text-slate-500 mt-2">MP3, WAV, M4A, OGG, OPUS (Máx. 15MB)</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

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
