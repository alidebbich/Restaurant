/**
 * Calendar Utilities for Guest Reservations
 * RFC 5545 .ics file generation and Google / Apple calendar deep-links.
 */

export type CalendarEventParams = {
  reference: string;
  restaurantName: string;
  restaurantAddress: string;
  serviceDate: string; // YYYY-MM-DD
  startMinute: number;
  durationMinutes: number;
  partySize: number;
  notes?: string | null;
  manageUrl?: string;
};

/**
 * Formats a Date object to RFC 5545 iCalendar UTC date-time string (YYYYMMDDTHHMMSSZ).
 */
function toIcsUtcString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Derives start and end Date objects in UTC assuming Africa/Tunis (+01:00 standard, no DST).
 */
export function getReservationDateTimes(serviceDate: string, startMinute: number, durationMinutes: number) {
  const [year, month, day] = serviceDate.split("-").map(Number);
  const startHour = Math.floor(startMinute / 60);
  const startMin = startMinute % 60;

  // Africa/Tunis is UTC+1 year-round
  // To create a Date in UTC: Date.UTC(year, month - 1, day, startHour - 1, startMin)
  const startUtcMs = Date.UTC(year, month - 1, day, startHour - 1, startMin);
  const endUtcMs = startUtcMs + durationMinutes * 60 * 1000;

  return {
    startDate: new Date(startUtcMs),
    endDate: new Date(endUtcMs),
  };
}

/**
 * Generates an .ics file string compliant with RFC 5545.
 */
export function generateIcsFile(params: CalendarEventParams): string {
  const { startDate, endDate } = getReservationDateTimes(
    params.serviceDate,
    params.startMinute,
    params.durationMinutes
  );

  const uid = `${params.reference}-${Date.now()}@darzitoun.tn`;
  const stamp = toIcsUtcString(new Date());
  const dtStart = toIcsUtcString(startDate);
  const dtEnd = toIcsUtcString(endDate);

  const summary = `Réservation ${params.restaurantName} (${params.partySize} pers.) [${params.reference}]`;
  const descriptionLines = [
    `Réservation confirmée au restaurant ${params.restaurantName}`,
    `Numéro de référence : ${params.reference}`,
    `Nombre de convives : ${params.partySize} personnes`,
  ];
  if (params.notes) {
    descriptionLines.push(`Remarques : ${params.notes}`);
  }
  if (params.manageUrl) {
    descriptionLines.push(`Gérer votre réservation : ${params.manageUrl}`);
  }
  const description = descriptionLines.join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dar Zitoun//Reservation System//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${params.restaurantAddress.replace(/,/g, "\\,")}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Rappel: Réservation chez ${params.restaurantName} dans 2 heures`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Generates a Google Calendar web deep-link.
 */
export function getGoogleCalendarUrl(params: CalendarEventParams): string {
  const { startDate, endDate } = getReservationDateTimes(
    params.serviceDate,
    params.startMinute,
    params.durationMinutes
  );

  const dtStart = toIcsUtcString(startDate);
  const dtEnd = toIcsUtcString(endDate);

  const title = encodeURIComponent(`Réservation ${params.restaurantName} [${params.reference}]`);
  const details = encodeURIComponent(
    `Réservation ${params.reference} (${params.partySize} pers.) au restaurant ${params.restaurantName}.\n` +
      (params.manageUrl ? `Gérer: ${params.manageUrl}` : "")
  );
  const location = encodeURIComponent(params.restaurantAddress);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
}

