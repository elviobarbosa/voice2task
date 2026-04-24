import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { toFile } from "openai";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400, headers: corsHeaders });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo de 15MB." },
        { status: 400, headers: corsHeaders }
      );
    }

    // O WhatsApp costuma enviar arquivos com a extensão .opus ou MIME types que o Whisper recusa.
    // No entanto, o codec (Opus) é totalmente suportado pelo Whisper se disser que é .ogg.
    // Portanto, convertemos o arquivo em um Buffer e passamos para a API com o nome "audio.ogg".
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioFile = await toFile(buffer, "audio.ogg", { type: "audio/ogg" });

    // 1. Transcrição com Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const transcriptionText = transcription.text;

    // 2. Extração de tarefas com GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `TEXTO:\n"""\n${transcriptionText}\n"""` },
      ],
      response_format: { type: "json_object" },
    });

    // Parse do JSON retornado pelo modelo
    let resultJson;
    try {
      resultJson = JSON.parse(completion.choices[0].message.content || "{}");
    } catch (e) {
      return NextResponse.json({ error: "Erro ao interpretar resposta da IA." }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(resultJson, { headers: corsHeaders });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor." },
      { status: 500, headers: corsHeaders }
    );
  }
}
