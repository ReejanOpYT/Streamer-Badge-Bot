'use strict';

const { loadConfig, saveConfig } = require('../utils/dataStore');
const { baseEmbed, successEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'setvc',
  ownerOnly: true,
  description: 'Set default / force voice channel',
  async execute(message, args, client) {
    const cfg = loadConfig();
    if (!args[0]) {
      const emb = baseEmbed(message.author, client.botName)
        .setTitle(`${getEmoji('cat_voice') || '🔊'} Default VC`)
        .setDescription(`Current: \`${cfg.defaultVcId || 'none'}\`\nUsage: \`.setvc <channelId>\``);
      return replyEmbed(message, emb);
    }
    const id = args[0].replace(/[<#>]/g, '');
    cfg.defaultVcId = id;
    saveConfig(cfg);
    return replyEmbed(
      message,
      successEmbed(message.author, client.botName, 'Default VC set', `\`${id}\``)
    );
  },
};
