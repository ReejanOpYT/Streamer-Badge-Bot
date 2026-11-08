'use strict';

const { getUser } = require('../utils/dataStore');
const { baseEmbed, replyEmbed, getEmoji, BADGE_TIERS, formatHours, nextTier } = require('../utils/helpers');

module.exports = {
  name: 'tiers',
  description: 'Show all 10 badge tiers + your hours',
  async execute(message, args, client) {
    const u = getUser(message.author.id);
    const hours = (u.totalSeconds || 0) / 3600;

    const lines = BADGE_TIERS.map((t) => {
      const mark = hours >= t.hours ? '●' : '○';
      return `${mark} **${t.name}** — ${t.hours}h`;
    });

    const emb = baseEmbed(message.author, client.botName)
      .setTitle(`${getEmoji('trophy') || '🏆'} Badge Tiers`)
      .setDescription(
        [
          ...lines,
          '',
          `**Your hours**`,
          `${formatHours(u.totalSeconds)}h`,
          '',
          `Next: ${nextTier(hours)}`,
        ].join('\n')
      );

    return replyEmbed(message, emb);
  },
};
