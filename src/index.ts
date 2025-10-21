import { CalendarClient } from "./calendar";
import { SlackClient } from "./slack";
import { parseEventTitle } from "./emoji-parser";
import type { Config } from "./types";

// Load configuration from environment variables
function loadConfig(): Config {
  const required = [
    "GOOGLE_CALENDAR_ID",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "SLACK_USER_TOKEN",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    googleCalendarId: process.env.GOOGLE_CALENDAR_ID!,
    googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY!,
    slackUserToken: process.env.SLACK_USER_TOKEN!,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "60000", 10),
    logLevel: process.env.LOG_LEVEL || "info",
    port: parseInt(process.env.PORT || "8080", 10),
  };
}

// Track the last event we set to avoid duplicate updates
let lastEventId: string | null = null;

async function pollAndUpdate(
  calendarClient: CalendarClient,
  slackClient: SlackClient,
): Promise<void> {
  try {
    // Get events starting in the next minute
    const upcomingEvents = await calendarClient.getUpcomingEvents();

    if (upcomingEvents.length === 0) {
      // Check if we should clear the status (no current events)
      const currentEvents = await calendarClient.getCurrentEvents();
      if (currentEvents.length === 0 && lastEventId !== null) {
        console.log("No active events, clearing status");
        await slackClient.clearStatus();
        lastEventId = null;
      }
      return;
    }

    // Process the first upcoming event
    const event = upcomingEvents[0];

    // Skip if we already processed this event
    if (event.id === lastEventId) {
      return;
    }

    console.log(`Found upcoming event: "${event.summary}"`);

    // Parse the event title for emoji status
    let parsedStatus = parseEventTitle(event.summary);

    // If no emoji found, use calendar emoji as fallback
    if (!parsedStatus) {
      console.log(
        `Event "${event.summary}" does not start with an emoji, using calendar fallback`,
      );
      parsedStatus = {
        emoji: "📅",
        text: event.summary,
      };
    }

    // Calculate expiration timestamp (when the event ends)
    const endTime = new Date(event.end);
    const expirationTimestamp = Math.floor(endTime.getTime() / 1000);

    // Update Slack status
    await slackClient.updateStatus(parsedStatus, expirationTimestamp);
    lastEventId = event.id;

    console.log(`Status will expire at ${endTime.toISOString()}`);
  } catch (error) {
    console.error("Error during poll cycle:", error);
    // Don't throw - we want to continue polling even if one cycle fails
  }
}

async function main() {
  console.log("Starting Slack-Calendar Status Sync...");

  // Load configuration
  const config = loadConfig();
  console.log(`Poll interval: ${config.pollIntervalMs}ms`);

  // Initialize clients
  const calendarClient = new CalendarClient(
    config.googleCalendarId,
    config.googleServiceAccountKey,
  );
  const slackClient = new SlackClient(config.slackUserToken);

  // Test Slack connection
  const slackConnected = await slackClient.testConnection();
  if (!slackConnected) {
    throw new Error("Failed to connect to Slack. Check your SLACK_USER_TOKEN.");
  }

  console.log("All systems ready. Starting poll loop...\n");

  // Start HTTP server for health checks
  const server = Bun.serve({
    port: config.port,
    fetch(req) {
      const url = new URL(req.url);

      // Health check endpoint
      if (url.pathname === "/health" || url.pathname === "/") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            lastEventId: lastEventId,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`HTTP server listening on port ${config.port}`);

  // Initial poll
  await pollAndUpdate(calendarClient, slackClient);

  // Set up polling interval
  const intervalId = setInterval(async () => {
    await pollAndUpdate(calendarClient, slackClient);
  }, config.pollIntervalMs);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down gracefully...");
    clearInterval(intervalId);
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Start the application
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
