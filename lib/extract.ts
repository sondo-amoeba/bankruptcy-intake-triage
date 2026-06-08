import { GoogleGenAI } from "@google/genai";
import { buildUserPrompt, TRIAGE_SYSTEM_PROMPT } from "./prompt";
import { triageExtractionSchema, type TriageExtraction } from "./schema";

const GEMINI_MODEL = "gemini-2.0-flash";

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export async function extractWithGemini(
  intakeText: string,
  retryStrict = false,
): Promise<TriageExtraction | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = retryStrict
    ? `${TRIAGE_SYSTEM_PROMPT}\n\nReturn valid JSON only. No markdown fences.`
    : TRIAGE_SYSTEM_PROMPT;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildUserPrompt(intakeText),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty Gemini response");
  }

  const parsed = JSON.parse(text);
  return triageExtractionSchema.parse(parsed);
}
