import type { ParsedStatus } from "./types";

/**
 * Checks if a string starts with an emoji character
 */
function startsWithEmoji(text: string): boolean {
  // Emoji ranges in Unicode:
  // - Basic emoticons and symbols: \u{1F600}-\u{1F64F}
  // - Supplemental symbols: \u{1F300}-\u{1F5FF}
  // - Transport and map symbols: \u{1F680}-\u{1F6FF}
  // - Misc symbols: \u{2600}-\u{26FF}
  // - Dingbats: \u{2700}-\u{27BF}
  // - Flags: \u{1F1E6}-\u{1F1FF}
  // - Extended pictographs: \u{1F900}-\u{1F9FF}
  // - Additional emoticons: \u{1FA70}-\u{1FAFF}
  const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F004}-\u{1F0CF}\u{1F170}-\u{1F251}]/u;
  return emojiRegex.test(text);
}

/**
 * Extracts the first emoji and remaining text from a string
 */
function extractEmoji(text: string): { emoji: string; remaining: string } {
  // This regex captures:
  // - Base emoji characters
  // - Skin tone modifiers (\u{1F3FB}-\u{1F3FF})
  // - Variation selectors (\u{FE0F}, \u{FE0E})
  // - Zero-width joiner (\u{200D}) for compound emojis
  // - Following emoji components (for ZWJ sequences like 👨‍💻)
  const emojiMatch = text.match(
    /^((?:[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F004}-\u{1F0CF}\u{1F170}-\u{1F251}][\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{FE0E}]?(?:\u{200D}[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F004}-\u{1F0CF}\u{1F170}-\u{1F251}][\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{FE0E}]?)*)+)(.*)$/u
  );

  if (!emojiMatch) {
    return { emoji: "", remaining: text };
  }

  return {
    emoji: emojiMatch[1].trim(),
    remaining: emojiMatch[2].trim(),
  };
}

/**
 * Converts a Unicode emoji to Slack emoji format (:emoji_name:)
 * Falls back to the original emoji if no conversion is needed
 */
function convertToSlackEmoji(emoji: string): string {
  // Slack accepts emojis in :name: format or Unicode
  // For now, we'll just use the Unicode emoji directly
  // Slack will handle the conversion automatically
  return emoji;
}

/**
 * Parses a calendar event title and extracts emoji status
 * Returns null if the title doesn't start with an emoji
 */
export function parseEventTitle(title: string): ParsedStatus | null {
  if (!title || title.trim().length === 0) {
    return null;
  }

  const trimmedTitle = title.trim();

  if (!startsWithEmoji(trimmedTitle)) {
    return null;
  }

  const { emoji, remaining } = extractEmoji(trimmedTitle);

  if (!emoji) {
    return null;
  }

  const slackEmoji = convertToSlackEmoji(emoji);
  const statusText = remaining || "Busy";

  return {
    emoji: slackEmoji,
    text: statusText,
  };
}
