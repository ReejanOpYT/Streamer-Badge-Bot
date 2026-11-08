'use strict';

const { baseEmbed, replyEmbed, getEmoji } = require('../utils/helpers');

module.exports = {
  name: 'help',
  description: 'Show all commands',
  async execute(message, args, client) {
    const p = client.prefix;
    const emb = baseEmbed(message.author, client.botName)
      .setTitle(`${getEmoji('book') || '📖'} ${client.botName} — Commands`)
      .setDescription(
        [
          '**User**',
          `\`${p}link\` — Link Your Account menu (tokens via modal only)`,
          `\`${p}linkalt\` — Link watcher / alt token`,
          `\`${p}room <id|url>\` — Set target voice channel`,
          `\`${p}join\` — Start Go Live on main + alt watches`,
          `\`${p}leave\` — Stop session`,
          `\`${p}status\` — Session + hours`,
          `\`${p}tiers\` — Badge tiers + your progress`,
          `\`${p}unlink\` — Remove stored tokens`,
          `\`${p}help\` — This message`,
          '',
          '**Owner**',
          `\`${p}setcmdchannel here\` — Restrict user commands to this channel`,
          `\`${p}setcmdchannel add|remove|clear|list\` — Manage allowed channels`,
          `\`${p}setvc <channelId>\` — Default / force VC`,
          `\`${p}setchannel <channelId>\` — Sticky message channel`,
          `\`${p}setstreamerrole <roleId>\` — Role on successful link`,
          `\`${p}setstickyline <text>\` — Last line of sticky`,
          `\`${p}goall\` — Force-start linked users`,
          `\`${p}stopall\` — Stop every session`,
          `\`${p}sessions\` — List active sessions`,
          '',
          `_Sticky message stays plain text. All other replies use embeds + components._`,
          '',
          `Support: ${process.env.SUPPORT_SERVER || 'https://discord.gg/roles'}`,
        ].join('\n')
      );

    return replyEmbed(message, emb);
  },
};
