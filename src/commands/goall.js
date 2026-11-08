'use strict';

const { loadUsers, getDecryptedTokens, loadConfig } = require('../utils/dataStore');
const { sessionManager } = require('../utils/streamClient');
const { successEmbed, replyEmbed } = require('../utils/helpers');

module.exports = {
  name: 'goall',
  ownerOnly: true,
  description: 'Force start stream for all linked users who have a room',
  async execute(message, args, client) {
    const secret = process.env.ENCRYPTION_KEY || 'fallback-key-change-me-32chars!!';
    const users = loadUsers();
    const cfg = loadConfig();
    let started = 0;
    let skipped = 0;

    for (const [userId, u] of Object.entries(users)) {
      const tokens = getDecryptedTokens(userId, secret);
      if (!tokens.main) {
        skipped++;
        continue;
      }
      const channelId = u.channelId || cfg.defaultVcId;
      const guildId = u.guildId;
      if (!channelId) {
        skipped++;
        continue;
      }
      if (sessionManager.has(userId)) {
        skipped++;
        continue;
      }
      try {
        await sessionManager.startSession({
          userId,
          mainToken: tokens.main,
          altToken: tokens.alt || null,
          guildId,
          channelId,
          channelName: u.channelName || 'VC',
        });
        started++;
      } catch {
        skipped++;
      }
    }

    return replyEmbed(
      message,
      successEmbed(
        message.author,
        client.botName,
        'goall',
        `Started: **${started}** · Skipped: **${skipped}**`
      )
    );
  },
};
