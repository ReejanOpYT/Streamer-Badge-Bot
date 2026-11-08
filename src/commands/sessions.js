'use strict';

const { sessionManager } = require('../utils/streamClient');
const { baseEmbed, errorEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'sessions',
  ownerOnly: true,
  description: 'List all active streaming sessions',
  async execute(message, args, client) {
    const list = sessionManager.list();
    if (!list.length) {
      return replyEmbed(
        message,
        errorEmbed(message.author, client.botName, 'No sessions', 'No active sessions.')
      );
    }
    const lines = list.map(
      (s, i) =>
        `**${i + 1}.** <@${s.userId}> · ${s.username} · stream ${s.streamActive ? 'ON' : '…'} · viewer ${s.hasViewer ? 'yes' : 'no'} · since <t:${Math.floor(s.startedAt / 1000)}:R>`
    );
    const emb = baseEmbed(message.author, client.botName)
      .setTitle(`${getEmoji('stats-1') || '📡'} Active sessions (${list.length})`)
      .setDescription(lines.join('\n').slice(0, 4000));
    return replyEmbed(message, emb);
  },
};
