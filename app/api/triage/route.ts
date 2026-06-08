import { NextResponse } from "next/server";
import { extractWithGemini, isGeminiConfigured } from "@/lib/extract";
import { buildTriageResponse } from "@/lib/rules";
import { getSampleById } from "@/lib/samples";
import { triageRequestSchema } from "@/lib/schema";

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

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Use a sample intake or set a free key from Google AI Studio for custom paste.",
        },
        { status: 503 },
      );
    }

    let extraction;
    try {
      extraction = await extractWithGemini(intakeText);
    } catch {
      extraction = await extractWithGemini(intakeText, true);
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
