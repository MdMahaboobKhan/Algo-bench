import { NextRequest, NextResponse } from "next/server";
import { getAllProgress, getProgress, setStatus, type ProgressStatus } from "@/lib/db";

// GET /api/progress            -> all rows (for stats + list badges)
// GET /api/progress?id=<id>    -> single row (or null), used to restore the
//                                 editor's last code/language on mount
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    return NextResponse.json(getProgress(id) ?? null);
  }
  return NextResponse.json(getAllProgress());
}

interface ProgressBody {
  problemId: string;
  status: ProgressStatus;
}

const VALID_STATUSES: ProgressStatus[] = ["solved", "attempted", "unattempted"];

// POST { problemId, status } -> manual override, used for problems the judge
// can't auto-grade (custom-type signatures) as well as for resetting a status.
export async function POST(req: NextRequest) {
  let body: ProgressBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { problemId, status } = body;
  if (!problemId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "problemId and a valid status (solved|attempted|unattempted) are required" },
      { status: 400 }
    );
  }
  const row = setStatus(problemId, status);
  return NextResponse.json(row);
}
