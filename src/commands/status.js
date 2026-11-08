'use strict';

const { getUser, getDecryptedTokens } = require('../utils/dataStore');
const { sessionManager } = require('../utils/streamClient');
const { maskToken } = require('../utils/encryption');
const { baseEmbed, replyEmbed, getEmoji, formatHours, nextTier } = require('../utils/helpers');

module.exports = {
  name: 'status',
  description: 'Show current session status',
  async execute(message, args, client) {
    const secret = process.env.ENCRYPTION_KEY || 'fallback-key-change-me-32chars!!';
    const userId = message.author.id;
    const u = getUser(userId);
    const tokens = getDecryptedTokens(userId, secret);
    const session = sessionManager.get(userId);

    const lines = [
      `**Main token:** ${tokens.main ? maskToken(tokens.main) : 'not linked'}`,
      `**Alt token:** ${tokens.alt ? maskToken(tokens.alt) : 'not linked'}`,
      `**Room:** ${u.channelName || u.channelId || 'not set'}`,
      `**Hours logged:** ${formatHours(u.totalSeconds)}h`,
      `**Next tier:** ${nextTier((u.totalSeconds || 0) / 3600)}`,
      '',
      session
        ? `**Live session:** yes · stream ${session.streamer?.streamActive ? 'ACTIVE' : 'connecting'} · viewer ${session.viewer ? 'yes' : 'no'}`
        : '**Live session:** none',
    ];

    const emb = baseEmbed(message.author, client.botName)
      .setTitle(`${getEmoji('info') || '📊'} Status`)
      .setDescription(lines.join('\n'));

    return replyEmbed(message, emb);
  },
};
