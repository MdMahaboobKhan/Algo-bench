import { NextRequest, NextResponse } from "next/server";
import { submit } from "@/lib/judge/submit";
import { recordAttempt } from "@/lib/db";

interface SubmitBody {
  problemId: string; // "<patternSlug>/<problemSlug>"
  language: string;
  code: string;
}

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { problemId, language, code } = body;
  if (!problemId || !language || typeof code !== "string") {
    return NextResponse.json({ error: "problemId, language, and code are required" }, { status: 400 });
  }
  const [patternSlug, problemSlug] = problemId.split("/");
  if (!patternSlug || !problemSlug) {
    return NextResponse.json({ error: "invalid problemId" }, { status: 400 });
  }

  try {
    const result = await submit(patternSlug, problemSlug, language, code);
    // Only record a status-affecting attempt when the judge actually produced
    // a pass/fail signal (supported problem with at least one example run).
    // Unsupported / no-example problems don't get an automatic attempt mark
    // here -- those are tracked via the manual /api/progress override instead.
    if (result.supported && result.results.length > 0) {
      recordAttempt(problemId, result.allPassed, language, code);
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
