import { NextRequest, NextResponse } from "next/server";
import { searchProblems } from "@/lib/search";

// GET /api/search?q=<phrase-or-regex> -> matching problems (title matches
// first, then content matches with a snippet), max 30 results.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ results: searchProblems(q) });
}
