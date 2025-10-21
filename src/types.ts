export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

export interface ParsedStatus {
  emoji: string;
  text: string;
}

export interface Config {
  googleCalendarId: string;
  googleServiceAccountKey: string;
  slackUserToken: string;
  pollIntervalMs: number;
  logLevel: string;
}
