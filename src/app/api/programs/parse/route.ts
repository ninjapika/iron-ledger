import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { parseProgramPdf } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF is too large (20MB max)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseProgramPdf(buffer);
    return NextResponse.json({ parsed, fileName: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse the PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
