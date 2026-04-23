import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI, { toFile } from "openai";
import cors from "cors";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
app.use(cors());
const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/process", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const originalFilePath = req.file.path;
    const mp3FilePath = `${originalFilePath}.mp3`;

    // Converte o áudio original para mp3 garantindo compatibilidade com o Whisper
    await new Promise((resolve, reject) => {
      ffmpeg(originalFilePath)
        .toFormat('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(mp3FilePath);
    });

    // 1. Transcription
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(fs.createReadStream(mp3FilePath), "audio.mp3"),
      model: "whisper-1"
    });

    const transcriptionText = transcription.text;

    // 2. Prompt
    const systemPrompt = `Você é um assistente especialista em transformar conversas informais em tarefas claras e acionáveis.

Analise o texto e gere:

1. LISTA DE TAREFAS
- Extraia todas as tarefas implícitas e explícitas
- Reescreva cada tarefa de forma clara, objetiva e acionável
- Comece sempre com verbo (ex: "Enviar", "Ajustar", "Criar")
- Separe cada tarefa em um item

2. PRAZOS (se houver)
- Identifique datas, dias ou urgência (ex: "hoje", "amanhã", "sexta", "semana que vem")
- Associe o prazo à tarefa correspondente
- Se não houver prazo, retorne null

3. RESPONSÁVEIS (se houver)
- Identifique quem deve executar (ex: "eu", "você", "João", "time")
- Se não estiver claro, retorne null

4. PRIORIDADE
- Classifique cada tarefa como: Alta, Média ou Baixa
- Baseie-se no contexto (urgência, impacto)

5. RESUMO
- Gere um resumo curto (máximo 2 linhas) explicando o contexto geral

⚠️ REGRAS IMPORTANTES:
- NÃO inventar informações
- NÃO repetir o texto original
- NÃO incluir explicações, apenas o resultado

Sua resposta DEVE ser estritamente em formato JSON, com a seguinte estrutura:
{
  "tasks": [
    {
      "text": "Descrição da tarefa",
      "deadline": "prazo se houver, senão null",
      "assignee": "responsável se houver, senão null",
      "priority": "Alta, Média ou Baixa"
    }
  ],
  "summary": "Resumo curto de até 2 linhas"
}`;

    // 3. LLM
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `TEXTO:\n"""\n${transcriptionText}\n"""` }
      ],
      response_format: { type: "json_object" }
    });

    // Cleanup
    if (fs.existsSync(originalFilePath)) fs.unlinkSync(originalFilePath);
    if (fs.existsSync(mp3FilePath)) fs.unlinkSync(mp3FilePath);

    res.json(JSON.parse(completion.choices[0].message.content));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Backend running on http://localhost:3000"));
