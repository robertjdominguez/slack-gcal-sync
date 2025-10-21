# Slack-Calendar Status Sync

Automatically sync your Google Calendar events to your Slack status. When a calendar event starts with an emoji (like "🏠 Working from home"), this service will update your Slack status with that emoji and text.

## How It Works

The application polls your Google Calendar every minute, looking for events that are about to start. If an event's title begins with an emoji, it extracts the emoji and remaining text, then updates your Slack status accordingly. If no emoji is found, it uses a calendar emoji (📅) as a fallback.

**Examples:**
```
Calendar Event: "🏠 Working from home"
Slack Status:   🏠 Working from home

Calendar Event: "Team Meeting"
Slack Status:   📅 Team Meeting
```

The status automatically expires when the calendar event ends.

## Prerequisites

- [Bun](https://bun.sh/) installed (for local development)
- Google Calendar API access
- Slack workspace with user token
- Docker (for containerized deployment)

## Setup

### 1. Google Calendar API Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create a service account:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details and click "Create"
   - Skip the optional permissions and click "Done"

5. Generate service account key:
   - Click on the newly created service account
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Save the downloaded JSON file securely

6. Share your calendar with the service account:
   - Open Google Calendar
   - Click the three dots next to your calendar name
   - Click "Settings and sharing"
   - Scroll to "Share with specific people"
   - Add the service account email (found in the JSON file as `client_email`)
   - Give it "See all event details" permission

### 2. Slack App Configuration

1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" > "From scratch"
3. Name your app (e.g., "Calendar Status Sync") and select your workspace

4. Add User Token Scopes:
   - Navigate to "OAuth & Permissions"
   - Scroll to "User Token Scopes"
   - Add the following scopes:
     - `users.profile:write` - Update your status
     - `users.profile:read` - Read your profile (for testing)

5. Install the app to your workspace:
   - Click "Install to Workspace" at the top of the page
   - Authorize the app

6. Copy your User OAuth Token:
   - After installation, you'll see "User OAuth Token"
   - It starts with `xoxp-`
   - Save this token securely

### 3. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```bash
   # Your Google Calendar email
   GOOGLE_CALENDAR_ID=your-email@gmail.com

   # Paste the entire contents of your service account JSON file
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

   # Your Slack user token (starts with xoxp-)
   SLACK_USER_TOKEN=xoxp-your-slack-user-token

   # Optional: Poll interval in milliseconds (default: 60000 = 1 minute)
   POLL_INTERVAL_MS=60000

   # Optional: Logging level
   LOG_LEVEL=info
   ```

**Important:** The `GOOGLE_SERVICE_ACCOUNT_KEY` should be the entire JSON object on a single line.

**Tip:** Use this command to compress your service account JSON to a single line:
```bash
cat service-account-key.json | jq -c
```
Then copy the output into your `.env` file.

## Local Development

### Install Dependencies

```bash
bun install
```

### Run Locally

```bash
bun run dev
```

The application will:
1. Verify connection to Slack
2. Start polling your Google Calendar every minute
3. Update your Slack status when events with emojis are found
4. Log all activities to the console


## Docker Deployment

### Build the Image

```bash
docker build -t slack-cal .
```

### Run with Docker

```bash
docker run -d \
  --name slack-cal \
  --env-file .env \
  --restart unless-stopped \
  slack-cal
```

### View Logs

```bash
docker logs -f slack-cal
```

### Stop the Container

```bash
docker stop slack-cal
docker rm slack-cal
```

## Deployment to GCP with Cloud Build

The easiest way to deploy is using Google Cloud Build to automatically build your Docker image whenever you push to your repository.

### 1. Connect Your Repository

1. Go to the [Cloud Build Triggers page](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"Connect Repository"**
3. Select your source provider (GitHub, GitLab, or Bitbucket)
4. Authenticate and select your `slack-cal` repository
5. Click **"Connect"**

### 2. Create a Build Trigger

1. Click **"Create Trigger"**
2. Configure the trigger:
   - **Name:** `slack-cal-build`
   - **Event:** Push to a branch
   - **Source:** Select your connected repository
   - **Branch:** `^main$` (or your default branch name)
   - **Configuration:** Cloud Build configuration file (yaml or json)
   - **Location:** `/cloudbuild.yaml`
3. Click **"Create"**

Now every push to your main branch will automatically build a new Docker image.

### 3. Create Secrets

1. Go to [Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Click **"Create Secret"** for each of the following:

   **Secret 1: google-calendar-id**
   - Name: `google-calendar-id`
   - Secret value: `your-email@gmail.com`

   **Secret 2: slack-token**
   - Name: `slack-token`
   - Secret value: `xoxp-your-slack-token`

   **Secret 3: google-service-account-key**
   - Name: `google-service-account-key`
   - Secret value: Paste your entire service account JSON (use `cat service-account-key.json | jq -c`)

### 4. Deploy to Cloud Run

1. Go to [Cloud Run](https://console.cloud.google.com/run)
2. Click **"Create Service"**
3. Configure:
   - **Container image URL:** Click "Select" and choose your `slack-cal:latest` image from Container Registry
   - **Service name:** `slack-cal`
   - **Region:** Choose your preferred region
   - **CPU allocation:** CPU is always allocated
   - **Minimum instances:** 1
   - **Maximum instances:** 1
   - **Authentication:** Require authentication

4. Under **"Container, Variables & Secrets, Connections, Security"**:
   - Click **"Variables & Secrets"** tab
   - Click **"Reference a Secret"**
   - Add each secret:
     - Reference `google-calendar-id` → expose as environment variable `GOOGLE_CALENDAR_ID`
     - Reference `slack-token` → expose as environment variable `SLACK_USER_TOKEN`
     - Reference `google-service-account-key` → expose as environment variable `GOOGLE_SERVICE_ACCOUNT_KEY`

5. Click **"Create"**

### 5. Update Deployments

Every time you push to your main branch:
1. Cloud Build automatically builds a new image
2. Go to your Cloud Run service
3. Click **"Edit & Deploy New Revision"**
4. Select the new image (or keep `latest` tag)
5. Click **"Deploy"**

Your Slack status will now automatically sync with your Google Calendar events!

## Troubleshooting

### Slack Status Not Updating

- Verify your `SLACK_USER_TOKEN` is correct and starts with `xoxp-`
- Ensure your Slack app has the `users.profile:write` scope
- Check the logs for API errors

### Calendar Events Not Found

- Verify the service account email has access to your calendar
- Check that `GOOGLE_CALENDAR_ID` matches your calendar email
- Ensure the service account key JSON is properly formatted
- Look for "403 Forbidden" errors in logs (indicates permission issues)

### Status Updates

All calendar events will update your Slack status:

- Events starting with an emoji use that emoji: "🏠 Working from home" → 🏠 Working from home
- Events without emojis use a calendar fallback: "Team meeting" → 📅 Team meeting
- Emojis must be at the start: "Working from home 🏠" → 📅 Working from home 🏠

### Application Crashes on Startup

- Check that all required environment variables are set
- Verify the `GOOGLE_SERVICE_ACCOUNT_KEY` is valid JSON
- Ensure no quote escaping issues in the service account key

### Docker Build Fails

- Make sure you have the latest version of Docker
- Try clearing Docker cache: `docker system prune -a`
- Check that all files exist in the project directory

## Development

### Project Structure

```
slack-cal/
├── src/
│   ├── index.ts           # Main application entry point
│   ├── calendar.ts        # Google Calendar API client
│   ├── slack.ts           # Slack API client
│   ├── emoji-parser.ts    # Emoji extraction logic
│   └── types.ts           # TypeScript type definitions
├── Dockerfile             # Container configuration
├── .dockerignore
├── .gitignore
├── package.json
├── tsconfig.json
├── .env.example          # Environment variable template
└── README.md
```

### Type Checking

```bash
bun run type-check
```

## Security Notes

- Never commit `.env` or service account JSON files to version control
- Use environment variables or secret managers for sensitive data
- Rotate tokens and keys regularly
- Limit service account permissions to read-only calendar access
- Use the principle of least privilege for Slack scopes

## License

MIT
