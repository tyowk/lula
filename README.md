# Discord Bot

A Discord.js bot built with Bun and TypeScript. Prefix and slash commands, event handlers, button interactions, and local database storage are ready to use.

## Requirements

- [Bun](https://bun.sh/)
- A Discord application and bot created in the [Discord Developer Portal](https://discord.com/developers/applications)

## Discord application setup

1. Create an application in the Discord Developer Portal and add a bot.
2. Copy the bot token into `DISCORD_TOKEN` in your local `.env` file. Never commit or share this token.
3. Enable **Message Content Intent** under the bot's privileged gateway intents. Prefix commands need this setting.
4. Invite the bot using OAuth2 with the `bot` and `applications.commands` scopes. Grant the permissions it needs, including **View Channels**, **Send Messages**, and **Embed Links**.

## Install

From the project directory:

```sh
bun install
cp env.example .env
```

Open `.env` and set the required values. `.env` is ignored by Git. On Replit, store sensitive values such as `DISCORD_TOKEN` in Secrets instead.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID` | For slash commands | Application ID |
| `DISCORD_GUILD_ID` | No | Test server ID for guild-only slash command registration; leave empty for global registration |
| `BOT_PREFIX` | No | Prefix used by text commands; the example value is `lula` |
| `BOT_OWNER_IDS` | No | Comma-separated Discord user IDs treated as bot owners |
| `DATABASE_FILE` | No | Local database file path; defaults to `data/bot.db` |
| `DEFAULT_LANGUAGE` | No | Default locale: `en` or `id` |
| `LOG_LEVEL` | No | Logging threshold: `debug`, `info`, `warn`, or `error` |

Bot settings and default values are in `src/config.ts`.

## Run the bot

Start in development mode with automatic restarts:

```sh
bun run dev
```

Run without watch mode:

```sh
bun run start
```

## Commands

The example ping command works with both the text prefix and slash commands. With the example prefix, run:

```text
lula ping
```

Create additional command files in `src/commands`. To publish slash commands, set `DISCORD_CLIENT_ID` and run:

```sh
bun run register
```

If `DISCORD_GUILD_ID` is set, commands are registered to that server for testing. Otherwise, they are registered globally.

## Events and interactions

- Add event files in `src/events`. `guildCreate.ts` is an example.
- Add button, select-menu, and modal handlers in `src/interactions`. `exampleButton.ts` handles a button with the custom ID `example:acknowledge`.

## Database and languages

The bot creates its local database at `data/bot.db` when it starts. Database statements are in `src/database/sql`. Database files are excluded from Git.

English and Indonesian translations are in `src/locales/en.json` and `src/locales/id.json`. Set `DEFAULT_LANGUAGE` to choose the default locale.

## Check the project

Run the TypeScript check with:

```sh
bun run check
```
