'use strict';

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const { ensureApplicationEmojis } = require('./src/utils/emojiManager');
const { refreshSticky } = require('./src/utils/stickyManager');
const { sessionManager } = require('./src/utils/streamClient');
const { getUser, setUser } = require('./src/utils/dataStore');

const BOT_NAME = process.env.BOT_NAME || 'Streamer';
const PREFIX = process.env.DEFAULT_PREFIX || '.';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.botName = BOT_NAME;
client.prefix = PREFIX;

/* load command modules */
const commandsPath = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsPath, file));
  if (cmd.name) client.commands.set(cmd.name, cmd);
  if (cmd.aliases) {
    for (const a of cmd.aliases) client.commands.set(a, cmd);
  }
}

/* load events */
const eventsPath = path.join(__dirname, 'src', 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const ev = require(path.join(eventsPath, file));
  if (ev.once) {
    client.once(ev.name, (...args) => ev.execute(...args, client));
  } else {
    client.on(ev.name, (...args) => ev.execute(...args, client));
  }
}

/* periodic hour accrual for active sessions */
setInterval(() => {
  for (const [userId, entry] of sessionManager.sessions) {
    const u = getUser(userId);
    const elapsed = Math.floor((Date.now() - entry.startedAt) / 1000);
    // we store absolute total; on stop we flush the delta
    // here we keep a soft live counter by updating totalSeconds with session offset
    // simpler: every minute add 60s if stream is active
    if (entry.streamer?.streamActive) {
      setUser(userId, { totalSeconds: (u.totalSeconds || 0) + 60 });
    }
  }
}, 60_000);

client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error('Login failed:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('SIGINT', async () => {
  console.log('Shutting down…');
  await sessionManager.stopAll();
  process.exit(0);
});
