'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { baseEmbed, replyEmbed, getEmoji, buttonEmoji } = require('../utils/helpers');

module.exports = {
  name: 'link',
  aliases: [],
  description: 'Open the Link Your Account menu',
  async execute(message, args, client) {
    const emb = baseEmbed(message.author, client.botName)
      .setTitle(`${getEmoji('link') || '🔗'} Link Your Account`)
      .setDescription(
        [
          'Connect your Discord account to unlock V3XQuest quest features.',
          '',
          `${getEmoji('book') || '📖'} **Choose your setup guide:**`,
          'Select **Link Token**, **Token For PC**, **Token For Mobile**, or **Token For iOS** below.',
          '',
          `${getEmoji('cross') || '❌'} **Security:** Never post account credentials in a server channel or share them with anyone.`,
        ].join('\n')
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('link_main_token')
        .setLabel('Link Token')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(buttonEmoji('link69', '🔗')),
      new ButtonBuilder()
        .setCustomId('token_guide_pc')
        .setLabel('Token For PC')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(buttonEmoji('Tools', '💻')),
      new ButtonBuilder()
        .setCustomId('token_guide_mobile')
        .setLabel('Token For Mobile')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(buttonEmoji('ping', '📱'))
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('token_guide_ios')
        .setLabel('Token For iOS')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(buttonEmoji('Star', '🍎')),
      new ButtonBuilder()
        .setCustomId('link_alt_token')
        .setLabel('Link Alt Token')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(buttonEmoji('join', '👥'))
    );

    await replyEmbed(message, emb, [row1, row2]);
  },
};
