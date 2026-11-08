'use strict';

const { EmbedBuilder } = require('discord.js');
const { loadConfig, saveConfig } = require('./dataStore');
const { getEmoji } = require('./emojiManager');

/**
 * Build the sticky content (plain text style matching screenshot).
 */
function buildStickyContent(botName) {
  const cfg = loadConfig();
  const line = cfg.stickyLine || 'Put Server Vanity In Status to Get access';
  return [
    `Use \`.help\` to start`,
    ``,
    `Use this setup`,
    ``,
    `\`.link\`, \`.linkalt\`,`,
    `\`.join\``,
    ``,
    `Use server tag to get access`,
    ``,
    line,
  ].join('\n');
}

/**
 * Refresh sticky in the configured channel.
 * Deletes ONLY the previous sticky message sent by this bot, then posts a new one.
 */
async function refreshSticky(client) {
  const cfg = loadConfig();
  if (!cfg.stickyChannelId) return;

  let channel;
  try {
    channel = await client.channels.fetch(cfg.stickyChannelId);
  } catch {
    return;
  }
  if (!channel || !channel.isTextBased()) return;

  // Delete previous sticky if it still exists and belongs to us
  if (cfg.stickyMessageId) {
    try {
      const old = await channel.messages.fetch(cfg.stickyMessageId);
      if (old && old.author.id === client.user.id) {
        await old.delete().catch(() => {});
      }
    } catch {
      /* already gone */
    }
  }

  const content = buildStickyContent(process.env.BOT_NAME || 'Streamer');
  try {
    const msg = await channel.send({ content });
    cfg.stickyMessageId = msg.id;
    saveConfig(cfg);
  } catch (err) {
    console.warn('[sticky] failed to post:', err.message);
  }
}

/**
 * Called from messageCreate when a message appears in the sticky channel.
 * Only refresh if the message is NOT from us (or after a short delay).
 */
async function onMessageInStickyChannel(client, message) {
  const cfg = loadConfig();
  if (!cfg.stickyChannelId || message.channel.id !== cfg.stickyChannelId) return;
  // Ignore our own sticky posts to avoid loops
  if (message.author.id === client.user.id && message.id === cfg.stickyMessageId) return;

  // Small debounce so rapid messages don't spam
  if (client._stickyDebounce) clearTimeout(client._stickyDebounce);
  client._stickyDebounce = setTimeout(() => {
    refreshSticky(client).catch(() => {});
  }, 800);
}

module.exports = { refreshSticky, onMessageInStickyChannel, buildStickyContent };
