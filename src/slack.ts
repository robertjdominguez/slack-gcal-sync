import { WebClient } from "@slack/web-api";
import type { ParsedStatus } from "./types";

export class SlackClient {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  async updateStatus(status: ParsedStatus, expirationTimestamp?: number): Promise<void> {
    try {
      await this.client.users.profile.set({
        profile: {
          status_text: status.text,
          status_emoji: status.emoji,
          status_expiration: expirationTimestamp || 0,
        },
      });
      console.log(`✓ Slack status updated: ${status.emoji} ${status.text}`);
    } catch (error) {
      console.error("Failed to update Slack status:", error);
      throw error;
    }
  }

  async clearStatus(): Promise<void> {
    try {
      await this.client.users.profile.set({
        profile: {
          status_text: "",
          status_emoji: "",
          status_expiration: 0,
        },
      });
      console.log("✓ Slack status cleared");
    } catch (error) {
      console.error("Failed to clear Slack status:", error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.auth.test();
      console.log(`✓ Connected to Slack as ${result.user}`);
      return true;
    } catch (error) {
      console.error("Failed to connect to Slack:", error);
      return false;
    }
  }
}
