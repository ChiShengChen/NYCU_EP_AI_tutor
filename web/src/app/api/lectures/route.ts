import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/lectures — list weeks with page counts and sections */
/** GET /api/lectures?week=3 — get all chunks for a specific week, ordered by page */
/** GET /api/lectures?week=3&page=2 — get chunks for a specific page */
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const week = req.nextUrl.searchParams.get("week");
  const page = req.nextUrl.searchParams.get("page");

  // Specific week + page: return chunks for that page
  if (week && page) {
    const { data, error } = await supabase
      .from("lecture_chunks")
      .select("id, week_number, page_number, section_title, content, content_type, is_counterexample")
      .eq("week_number", parseInt(week))
      .eq("page_number", parseInt(page))
      .order("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ chunks: data });
  }

  // Specific week: return all pages with their content
  if (week) {
    const { data, error } = await supabase
      .from("lecture_chunks")
      .select("id, week_number, page_number, section_title, content, content_type, is_counterexample")
      .eq("week_number", parseInt(week))
      .order("page_number")
      .order("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by page
    const pages: Record<number, { page_number: number; section_title: string; chunks: typeof data }> = {};
    for (const chunk of data ?? []) {
      if (!pages[chunk.page_number]) {
        pages[chunk.page_number] = {
          page_number: chunk.page_number,
          section_title: chunk.section_title || "",
          chunks: [],
        };
      }
      pages[chunk.page_number].chunks.push(chunk);
      // Use the most specific section_title
      if (chunk.section_title && !pages[chunk.page_number].section_title) {
        pages[chunk.page_number].section_title = chunk.section_title;
      }
    }

    return NextResponse.json({
      week: parseInt(week),
      pages: Object.values(pages).sort((a, b) => a.page_number - b.page_number),
    });
  }

  // No params: return overview of all weeks
  const { data, error } = await supabase
    .from("lecture_chunks")
    .select("week_number, page_number, section_title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const weeks: Record<number, { week_number: number; page_count: number; sections: string[] }> = {};
  for (const row of data ?? []) {
    if (!weeks[row.week_number]) {
      weeks[row.week_number] = { week_number: row.week_number, page_count: 0, sections: [] };
    }
    // Count unique pages
    weeks[row.week_number].page_count = Math.max(weeks[row.week_number].page_count, row.page_number);
    if (row.section_title && !weeks[row.week_number].sections.includes(row.section_title)) {
      weeks[row.week_number].sections.push(row.section_title);
    }
  }

  return NextResponse.json({
    weeks: Object.values(weeks).sort((a, b) => a.week_number - b.week_number),
  });
}
