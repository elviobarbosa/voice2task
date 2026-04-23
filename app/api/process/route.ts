import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import openai from "@/lib/openai";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { toFile } from "openai";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo de 15MB." },
        { status: 400 }
      );
    }

    // Preparar caminhos temporários
    const tempDir = os.tmpdir();
    const fileId = uuidv4();
    
    // Extrai extensão original
    const originalExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'ogg' : 'ogg';
    const tempOriginalPath = path.join(tempDir, `${fileId}.${originalExt}`);
    const tempMp3Path = path.join(tempDir, `${fileId}.mp3`);

    // Salvar o ArrayBuffer em um arquivo temporário no disco
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempOriginalPath, buffer);

    // Converter para MP3 garantindo o suporte no Whisper
    await new Promise((resolve, reject) => {
      ffmpeg(tempOriginalPath)
        .toFormat('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(tempMp3Path);
    });

    // 1. Transcrição com Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(fs.createReadStream(tempMp3Path), "audio.mp3"),
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

    // Limpeza dos arquivos temporários
    if (fs.existsSync(tempOriginalPath)) fs.unlinkSync(tempOriginalPath);
    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);

    // Parse do JSON retornado pelo modelo
    let resultJson;
    try {
      resultJson = JSON.parse(completion.choices[0].message.content || "{}");
    } catch (e) {
      return NextResponse.json({ error: "Erro ao interpretar resposta da IA." }, { status: 500 });
    }

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
