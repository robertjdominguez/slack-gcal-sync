import { google } from "googleapis";
import type { CalendarEvent } from "./types";

export class CalendarClient {
  private calendar;

  constructor(calendarId: string, serviceAccountKey: string) {
    let credentials;

    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (error) {
      throw new Error(
        `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY as JSON. Make sure it's valid JSON on a single line. Error: ${error}`
      );
    }

    // Validate required fields
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error(
        "Invalid service account key: missing 'client_email' or 'private_key'. " +
        "Make sure you copied the entire JSON file content."
      );
    }

    // Fix newline characters in private key if they were escaped
    if (credentials.private_key && !credentials.private_key.includes('\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    this.calendar = google.calendar({ version: "v3", auth });
  }

  async getUpcomingEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);

    try {
      const response = await this.calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: oneMinuteFromNow.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      return events
        .filter((event) => event.summary && event.start?.dateTime)
        .map((event) => ({
          id: event.id!,
          summary: event.summary!,
          start: event.start!.dateTime!,
          end: event.end?.dateTime || event.start!.dateTime!,
        }));
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      throw error;
    }
  }

  async getCurrentEvents(): Promise<CalendarEvent[]> {
    const now = new Date();

    try {
      const response = await this.calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: now.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      return events
        .filter((event) => {
          if (!event.start?.dateTime || !event.end?.dateTime) return false;
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          return start <= now && end > now;
        })
        .map((event) => ({
          id: event.id!,
          summary: event.summary!,
          start: event.start!.dateTime!,
          end: event.end!.dateTime!,
        }));
    } catch (error) {
      console.error("Failed to fetch current calendar events:", error);
      throw error;
    }
  }
}
