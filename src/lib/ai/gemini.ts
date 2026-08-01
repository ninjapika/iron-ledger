import "server-only";
import { GoogleGenAI } from "@google/genai";

export interface ParsedProgramExercise {
  freeText: string;
  sets: number | null;
  reps: string | null; // "12", "AMRAP", "30s" — kept as text, DAREBEE mixes formats
  durationSec: number | null;
  rounds: number | null;
  restSec: number | null;
}

export interface ParsedProgramDay {
  dayIndex: number;
  title: string;
  type: "strength" | "cardio" | "rest";
  exercises: ParsedProgramExercise[];
}

export interface ParsedProgram {
  name: string;
  description: string;
  days: ParsedProgramDay[];
}

const MODEL = "gemini-2.5-flash";

const PROMPT = `You are reading a workout program PDF (often from DAREBEE, but could be any source).
Extract its structure into JSON only — no prose, no markdown fences.

Return this exact shape:
{
  "name": string,               // program title
  "description": string,        // 1-2 sentence summary
  "days": [
    {
      "dayIndex": number,        // 1-based
      "title": string,           // e.g. "Day 1", "Push", "Rest Day"
      "type": "strength" | "cardio" | "rest",
      "exercises": [
        {
          "freeText": string,    // the exercise name exactly as written
          "sets": number | null,
          "reps": string | null,      // could be "12", "AMRAP", "30s", "20 each side"
          "durationSec": number | null,
          "rounds": number | null,
          "restSec": number | null
        }
      ]
    }
  ]
}

Rules:
- If the program is a circuit/rounds format, put the round count in "rounds" and list each move once in "exercises".
- Rest days still get an entry with type "rest" and an empty exercises array.
- If a value truly isn't stated anywhere, use null — never invent numbers.
- Keep exercise names close to the original wording; don't rename them to a "standard" name.`;

export async function parseProgramPdf(pdfBuffer: Buffer): Promise<ParsedProgram> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env to enable DAREBEE PDF import.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBuffer.toString("base64") } },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned no text — the PDF may be unreadable or too large.");

  let parsed: ParsedProgram;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Occasionally still wraps in fences despite instructions — strip and retry once.
    const stripped = text.replace(/^```json\s*|```\s*$/g, "").trim();
    parsed = JSON.parse(stripped);
  }

  if (!parsed.days || !Array.isArray(parsed.days)) {
    throw new Error("Couldn't find a day-by-day structure in that PDF.");
  }
  return parsed;
}
