'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { baseEmbed, replyEmbed, getEmoji, buttonEmoji } = require('../utils/helpers');

module.exports = {
  name: 'linkalt',
  description: 'Link secondary (watcher) token',
  async execute(message, args, client) {
    const emb = baseEmbed(message.author, client.botName)
      .setTitle(`${getEmoji('link') || '🔗'} Link Alt / Watcher Token`)
      .setDescription(
        'The alt account joins the same voice channel and watches your Go Live stream so hours count toward the Streaming Profile Badge.\n\nUse the button below — tokens are accepted only via modal.'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('link_alt_token')
        .setLabel('Link Alt Token')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(buttonEmoji('join', '👥'))
    );

    await replyEmbed(message, emb, [row]);
  },
};
