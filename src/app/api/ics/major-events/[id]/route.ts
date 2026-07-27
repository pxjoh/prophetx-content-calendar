import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { buildIcsCalendar, icsResponseHeaders } from "@/lib/ics/generate";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await getDataStore().listMajorEvents({ includeArchived: true });
  const event = events.find((e) => e.id === id);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!event.start_time) {
    return NextResponse.json({ error: "Event has no date set yet" }, { status: 422 });
  }

  const calendar = buildIcsCalendar([
    {
      uid: `event-${event.id}`,
      title: event.title,
      description: event.description,
      start: new Date(event.start_time),
      end: event.end_time ? new Date(event.end_time) : null,
      url: event.prophetx_market_url,
    },
  ]);

  return new NextResponse(calendar, { headers: icsResponseHeaders(`${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`) });
}
