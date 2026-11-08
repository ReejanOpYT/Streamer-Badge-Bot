'use strict';

const { loadConfig, saveConfig } = require('../utils/dataStore');
const { refreshSticky } = require('../utils/stickyManager');
const { baseEmbed, successEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'setchannel',
  ownerOnly: true,
  description: 'Set the sticky message channel',
  async execute(message, args, client) {
    const cfg = loadConfig();
    if (!args[0]) {
      const emb = baseEmbed(message.author, client.botName)
        .setTitle(`${getEmoji('gear') || '⚙️'} Sticky channel`)
        .setDescription(`Current: \`${cfg.stickyChannelId || 'none'}\`\nUsage: \`.setchannel <channelId>\``);
      return replyEmbed(message, emb);
    }
    const id = args[0].replace(/[<#>]/g, '');
    cfg.stickyChannelId = id;
    cfg.stickyMessageId = null;
    saveConfig(cfg);
    await refreshSticky(client);
    return replyEmbed(
      message,
      successEmbed(message.author, client.botName, 'Sticky channel set', `\`${id}\` — sticky posted.`)
    );
  },
};
