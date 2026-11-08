# Streamer Bot

Discord bot that farms Streaming Profile Badge hours by driving real user accounts through Go Live (screen share) via the gateway, with an optional alt account that watches the stream so the hours count.

Built for discord.js v14 / Node 18+.

## Features

- `.link` menu matching the V3XQuest style (buttons + modals only — tokens never accepted in chat)
- Encrypted token storage (AES-256-GCM)
- Main account: join VC → Opcode 18 Go Live → Opcode 22 unpause
- Alt account: join same VC → Opcode 20 watch stream
- Heartbeats + auto-reconnect on gateway and voice/stream WebSockets
- Sticky message system (bot-owned message only, always at bottom)
- Application emoji auto-upload from `/emojis` on first start
- Badge tiers display + per-user hour tracking
- Owner controls: default VC, sticky channel/line, streamer role, goall / stopall / sessions

## Setup

1. **Clone / copy** this folder.

2. **Install**
   ```bash
   npm install
   ```

3. **Configure**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `BOT_TOKEN` — bot token
   - `CLIENT_ID` — application client id
   - `OWNER_IDS` — comma-separated Discord user IDs
   - `SUPPORT_SERVER` — invite URL
   - `ENCRYPTION_KEY` — any 32+ character secret (used to encrypt stored user tokens)
   - `BOT_NAME` — defaults to `Streamer`

4. **Invite the bot** with scopes `bot` + `applications.commands` and permissions:
   - Manage Messages (sticky)
   - Send Messages, Embed Links, Use External Emojis
   - Manage Roles (optional, for streamer role)
   - Connect / Speak in voice (optional; the actual streaming is done by user tokens)

5. **Run**
   ```bash
   npm start
   ```

   On first start the bot uploads every file in `emojis/` as Application Emojis (cached in `data/emojis.json`). Subsequent starts only fill missing ones.

6. **Owner bootstrap**
   ```
   .setcmdchannel here           # lock user commands to this channel
   .setchannel <channelId>       # sticky lives here
   .setstickyline Put Server Vanity In Status to Get access
   .setvc <voiceChannelId>       # optional default
   .setstreamerrole <roleId>     # optional
   ```

   Channel restriction: once `allowedCommandChannels` is non-empty, non-owners can only run commands in those channels. Owners always bypass. Sticky message remains plain text; all other command replies use embeds + components (CV2-style).

6b. **Owner bootstrap (legacy note)**
   ```
   .setchannel <channelId>     # sticky lives here
   .setstickyline Put Server Vanity In Status to Get access
   .setvc <voiceChannelId>     # optional default
   .setstreamerrole <roleId>   # optional
   ```

## User flow

1. `.link` → Link Token (modal) + optional Link Alt Token  
2. `.room <https://discord.com/channels/GUILD/CHANNEL>` or raw channel ID  
3. `.join` — main starts Go Live, alt watches  
4. `.status` / `.tiers` / `.leave`

## Data

All runtime state is under `data/`:

- `users.json` — encrypted tokens, room, hours
- `config.json` — sticky channel, sticky line, default VC, streamer role
- `emojis.json` — application emoji name → id cache

## Notes

- Automating user accounts violates Discord’s Terms of Service. Tokens can be invalidated; accounts can be disabled. Use at your own risk.
- Hours only progress while the bot process is running and the session is live.
- Tokens are never logged in full (first 10 + last 4 only).

## Support

See `SUPPORT_SERVER` in `.env`.
