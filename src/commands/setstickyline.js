'use strict';

const { loadConfig, saveConfig } = require('../utils/dataStore');
const { refreshSticky } = require('../utils/stickyManager');
const { baseEmbed, successEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'setstickyline',
  ownerOnly: true,
  description: 'Change the sticky message last line',
  async execute(message, args, client) {
    const cfg = loadConfig();
    if (!args.length) {
      const emb = baseEmbed(message.author, client.botName)
        .setTitle(`${getEmoji('book') || '📖'} Sticky line`)
        .setDescription(`Current:\n\`\`\`\n${cfg.stickyLine}\n\`\`\`\nUsage: \`.setstickyline <any text>\``);
      return replyEmbed(message, emb);
    }
    cfg.stickyLine = args.join(' ');
    saveConfig(cfg);
    await refreshSticky(client);
    return replyEmbed(
      message,
      successEmbed(message.author, client.botName, 'Sticky line updated', `\`\`\`\n${cfg.stickyLine}\n\`\`\``)
    );
  },
};
