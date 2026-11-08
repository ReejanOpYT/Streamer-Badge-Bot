'use strict';

const { EmbedBuilder } = require('discord.js');
const { getEmoji, resolveButtonEmoji } = require('./emojiManager');
const { loadConfig } = require('./dataStore');

/** Primary blue for all standard embeds */
const EMBED_BLUE = 0x3498db;
const EMBED_RED = 0xed4245;

const BADGE_TIERS = [
  { hours: 1, name: 'Tier 1: Newcomer' },
  { hours: 5, name: 'Tier 2: Fledgling' },
  { hours: 20, name: 'Tier 3: Breakout' },
  { hours: 75, name: 'Tier 4: Standout' },
  { hours: 150, name: 'Tier 5: Trendsetter' },
  { hours: 300, name: 'Tier 6: Headliner' },
  { hours: 500, name: 'Tier 7: Star' },
  { hours: 1000, name: 'Tier 8: Sensation' },
  { hours: 2000, name: 'Tier 9: Visionary' },
  { hours: 5000, name: 'Tier 10: Phenomenon' },
];

function footer(user, botName) {
  return {
    text: `Requested by ${user.username} | ${botName || process.env.BOT_NAME || 'Streamer'}`,
  };
}

function baseEmbed(user, botName) {
  return new EmbedBuilder().setColor(EMBED_BLUE).setFooter(footer(user, botName)).setTimestamp();
}

function errorEmbed(user, botName, title, description) {
  return baseEmbed(user, botName)
    .setColor(EMBED_RED)
    .setTitle(`${getEmoji('cross') || '❌'} ${title}`)
    .setDescription(description);
}

function successEmbed(user, botName, title, description) {
  return baseEmbed(user, botName)
    .setColor(EMBED_BLUE)
    .setTitle(`${getEmoji('tick') || '✅'} ${title}`)
    .setDescription(description);
}

/** Alias for resolveButtonEmoji — use on every ButtonBuilder.setEmoji() */
function buttonEmoji(name, unicodeFallback) {
  return resolveButtonEmoji(name, unicodeFallback);
}

function formatHours(seconds) {
  const h = (Number(seconds) || 0) / 3600;
  return h.toFixed(2);
}

function nextTier(hours) {
  for (const t of BADGE_TIERS) {
    if (hours < t.hours) {
      return `${t.name} — ${(t.hours - hours).toFixed(1)}h remaining`;
    }
  }
  return 'Tier 10: Phenomenon (max)';
}

function isOwner(userId) {
  const raw = process.env.OWNER_IDS || '';
  const ids = raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  return ids.includes(String(userId));
}

function isCommandChannelAllowed(channelId, userId) {
  if (isOwner(userId)) return true;
  const cfg = loadConfig();
  const list = Array.isArray(cfg.allowedCommandChannels) ? cfg.allowedCommandChannels : [];
  if (list.length === 0) return true;
  return list.includes(String(channelId));
}

async function replyEmbed(message, embeds, components = null) {
  const payload = {
    embeds: Array.isArray(embeds) ? embeds : [embeds],
    allowedMentions: { repliedUser: false },
  };
  if (components && components.length) payload.components = components;
  return message.reply(payload);
}

module.exports = {
  BADGE_TIERS,
  EMBED_BLUE,
  footer,
  baseEmbed,
  errorEmbed,
  successEmbed,
  buttonEmoji,
  formatHours,
  nextTier,
  isOwner,
  isCommandChannelAllowed,
  replyEmbed,
  getEmoji,
};
