import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildIcsCalendar, icsResponseHeaders } from "@/lib/ics/generate";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ideas = await getDataStore().listContentIdeas({ includeArchived: true });
  const idea = ideas.find((i) => i.id === id);
  if (!idea) return NextResponse.json({ error: "Content idea not found" }, { status: 404 });
  if (!idea.due_date) {
    return NextResponse.json({ error: "This idea has no due date set yet" }, { status: 422 });
  }

  const start = new Date(`${idea.due_date}T${idea.due_time ?? "09:00"}`);
  const calendar = buildIcsCalendar([
    {
      uid: `content-idea-${idea.id}`,
      title: `Content due: ${idea.title}`,
      description: idea.description,
      start,
    },
  ]);

  return new NextResponse(calendar, { headers: icsResponseHeaders(`${idea.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-deadline.ics`) });
}
