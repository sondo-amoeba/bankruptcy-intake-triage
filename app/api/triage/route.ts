import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildUserPrompt, TRIAGE_SYSTEM_PROMPT } from "@/lib/prompt";
import { buildTriageResponse } from "@/lib/rules";
import { getSampleById } from "@/lib/samples";
import { triageExtractionSchema, triageRequestSchema } from "@/lib/schema";

async function extractWithOpenAI(intakeText: string, retryStrict = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });
  const system = retryStrict
    ? `${TRIAGE_SYSTEM_PROMPT}\n\nReturn valid JSON only. No markdown fences.`
    : TRIAGE_SYSTEM_PROMPT;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: buildUserPrompt(intakeText) },
    ],
    temperature: 0.1,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty OpenAI response");
  }

  const parsed = JSON.parse(content);
  return triageExtractionSchema.parse(parsed);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = triageRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { intakeText, sampleId } = parsedBody.data;

    if (sampleId) {
      const sample = getSampleById(sampleId);
      if (!sample) {
        return NextResponse.json({ error: "Unknown sampleId" }, { status: 400 });
      }
      return NextResponse.json(buildTriageResponse(sample.cannedExtraction));
    }

    if (!intakeText?.trim()) {
      return NextResponse.json({ error: "intakeText is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Use a sample intake or set the key for custom paste.",
        },
        { status: 503 },
      );
    }

    let extraction;
    try {
      extraction = await extractWithOpenAI(intakeText);
    } catch {
      extraction = await extractWithOpenAI(intakeText, true);
    }

    if (!extraction) {
      return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
    }

    return NextResponse.json(buildTriageResponse(extraction));
  } catch (error) {
    console.error("Triage API error:", error);
    return NextResponse.json({ error: "Failed to analyze intake" }, { status: 502 });
  }
}
