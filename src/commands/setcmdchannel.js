'use strict';

const { loadConfig, saveConfig } = require('../utils/dataStore');
const { baseEmbed, successEmbed, errorEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'setcmdchannel',
  aliases: ['setcommandchannel', 'cmdchannel'],
  ownerOnly: true,
  description: 'Set / add / clear channels where users may run bot commands',
  async execute(message, args, client) {
    const cfg = loadConfig();
    if (!Array.isArray(cfg.allowedCommandChannels)) cfg.allowedCommandChannels = [];

    const sub = (args[0] || '').toLowerCase();

    // .setcmdchannel  → show list + set this channel if no args beyond empty
    if (!sub || sub === 'list') {
      const list = cfg.allowedCommandChannels;
      const emb = baseEmbed(message.author, client.botName)
        .setTitle(`${getEmoji('gear') || '⚙️'} Command channels`)
        .setDescription(
          list.length
            ? list.map((id, i) => `**${i + 1}.** <#${id}> (\`${id}\`)`).join('\n')
            : '_No restriction — commands work in every channel._\n\nUsage:\n`.setcmdchannel here` — allow this channel\n`.setcmdchannel add <id>`\n`.setcmdchannel remove <id>`\n`.setcmdchannel clear` — remove all restrictions'
        );
      return replyEmbed(message, emb);
    }

    if (sub === 'clear' || sub === 'reset') {
      cfg.allowedCommandChannels = [];
      saveConfig(cfg);
      return replyEmbed(
        message,
        successEmbed(message.author, client.botName, 'Restriction cleared', 'Commands can now be used in any channel.')
      );
    }

    if (sub === 'here' || sub === 'this') {
      const id = message.channel.id;
      if (!cfg.allowedCommandChannels.includes(id)) cfg.allowedCommandChannels.push(id);
      saveConfig(cfg);
      return replyEmbed(
        message,
        successEmbed(
          message.author,
          client.botName,
          'Command channel set',
          `Users may run commands in <#${id}>.\nAllowed: ${cfg.allowedCommandChannels.map((c) => `<#${c}>`).join(', ')}`
        )
      );
    }

    if (sub === 'add') {
      const id = (args[1] || '').replace(/[<#>]/g, '');
      if (!/^\d{15,22}$/.test(id)) {
        return replyEmbed(
          message,
          errorEmbed(message.author, client.botName, 'Invalid ID', 'Provide a channel ID: `.setcmdchannel add <channelId>`')
        );
      }
      if (!cfg.allowedCommandChannels.includes(id)) cfg.allowedCommandChannels.push(id);
      saveConfig(cfg);
      return replyEmbed(
        message,
        successEmbed(message.author, client.botName, 'Channel added', `<#${id}> is now allowed.`)
      );
    }

    if (sub === 'remove' || sub === 'rm' || sub === 'del') {
      const id = (args[1] || '').replace(/[<#>]/g, '');
      cfg.allowedCommandChannels = cfg.allowedCommandChannels.filter((c) => c !== id);
      saveConfig(cfg);
      return replyEmbed(
        message,
        successEmbed(message.author, client.botName, 'Channel removed', `\`${id}\` removed from allowed list.`)
      );
    }

    // bare channel id or mention
    const id = sub.replace(/[<#>]/g, '');
    if (/^\d{15,22}$/.test(id)) {
      if (!cfg.allowedCommandChannels.includes(id)) cfg.allowedCommandChannels.push(id);
      saveConfig(cfg);
      return replyEmbed(
        message,
        successEmbed(message.author, client.botName, 'Command channel set', `Users may run commands in <#${id}>.`)
      );
    }

    return replyEmbed(
      message,
      errorEmbed(
        message.author,
        client.botName,
        'Usage',
        '`.setcmdchannel here` · `.setcmdchannel add <id>` · `.setcmdchannel remove <id>` · `.setcmdchannel clear` · `.setcmdchannel list`'
      )
    );
  },
};
