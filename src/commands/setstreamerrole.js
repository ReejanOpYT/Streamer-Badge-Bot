'use strict';

const { loadConfig, saveConfig } = require('../utils/dataStore');
const { baseEmbed, successEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'setstreamerrole',
  ownerOnly: true,
  description: 'Role given when a user successfully links',
  async execute(message, args, client) {
    const cfg = loadConfig();
    if (!args[0]) {
      const emb = baseEmbed(message.author, client.botName)
        .setTitle(`${getEmoji('crown') || '👑'} Streamer role`)
        .setDescription(`Current: \`${cfg.streamerRoleId || 'none'}\`\nUsage: \`.setstreamerrole <roleId>\``);
      return replyEmbed(message, emb);
    }
    const id = args[0].replace(/[<@&>]/g, '');
    cfg.streamerRoleId = id;
    saveConfig(cfg);
    return replyEmbed(
      message,
      successEmbed(message.author, client.botName, 'Streamer role set', `\`${id}\``)
    );
  },
};
