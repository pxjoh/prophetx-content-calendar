interface IcsEventInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  /** Defaults to one hour after `start` when omitted. */
  end?: Date | null;
  url?: string | null;
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcsCalendar(events: IcsEventInput[]): string {
  const now = toIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProphetX Content Command Center//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const end = event.end ?? new Date(event.start.getTime() + 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@prophetx-content-calendar`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(event.start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function icsResponseHeaders(filename: string) {
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
