'use strict';

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { setMainToken, setAltToken, getUser } = require('../utils/dataStore');
const { maskToken } = require('../utils/encryption');
const { baseEmbed, errorEmbed, getEmoji, isOwner } = require('../utils/helpers');
const { loadConfig, saveConfig } = require('../utils/dataStore');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isButton()) {
        await handleButton(interaction, client);
      } else if (interaction.isModalSubmit()) {
        await handleModal(interaction, client);
      }
    } catch (err) {
      console.error('[interaction]', err);
      const payload = { embeds: [errorEmbed(interaction.user, client.botName, 'Error', err.message || 'Something went wrong')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};

async function handleButton(interaction, client) {
  const id = interaction.customId;

  if (id === 'link_main_token') {
    const modal = new ModalBuilder()
      .setCustomId('modal_link_main')
      .setTitle('Link Main Token');
    const input = new TextInputBuilder()
      .setCustomId('token_input')
      .setLabel('Paste your Discord account token')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Token (never shared publicly)')
      .setRequired(true)
      .setMinLength(50)
      .setMaxLength(120);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (id === 'link_alt_token') {
    const modal = new ModalBuilder()
      .setCustomId('modal_link_alt')
      .setTitle('Link Alt / Watcher Token');
    const input = new TextInputBuilder()
      .setCustomId('token_input')
      .setLabel('Paste your alt (watcher) account token')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Alt token (optional but recommended)')
      .setRequired(true)
      .setMinLength(50)
      .setMaxLength(120);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (id === 'token_guide_pc' || id === 'token_guide_mobile' || id === 'token_guide_ios') {
    const guides = {
      token_guide_pc: {
        title: 'Token For PC',
        body: [
          '1. Open Discord in your **browser** (discord.com/app) while logged in.',
          '2. Press `Ctrl + Shift + I` (Windows) or `Cmd + Option + I` (Mac) to open DevTools.',
          '3. Go to the **Network** tab → filter by `api`.',
          '4. Refresh the page (F5). Click any request to `discord.com/api`.',
          '5. In Headers look for **Authorization** — that is your token.',
          '6. Use the **Link Token** button and paste it into the modal.',
          '',
          'Never paste the token in chat.',
        ].join('\n'),
      },
      token_guide_mobile: {
        title: 'Token For Mobile',
        body: [
          '1. Use a browser-based Discord (not the official app) or a packet-capture tool you already trust.',
          '2. The safest path is still the **desktop/browser** method above.',
          '3. If you already have a token from a previous PC session, paste it via **Link Token**.',
          '',
          'Never share tokens in a server channel.',
        ].join('\n'),
      },
      token_guide_ios: {
        title: 'Token For iOS',
        body: [
          '1. Discord’s iOS app does not expose the token easily.',
          '2. Recommended: log in on a computer browser and follow the **Token For PC** steps.',
          '3. Paste the token using the **Link Token** button (modal only).',
          '',
          'Never post credentials in chat.',
        ].join('\n'),
      },
    };
    const g = guides[id];
    const emb = baseEmbed(interaction.user, client.botName)
      .setTitle(`${getEmoji('book') || '📖'} ${g.title}`)
      .setDescription(g.body);
    return interaction.reply({ embeds: [emb], ephemeral: true });
  }
}

async function handleModal(interaction, client) {
  const secret = process.env.ENCRYPTION_KEY || 'fallback-key-change-me-32chars!!';

  if (interaction.customId === 'modal_link_main') {
    const token = interaction.fields.getTextInputValue('token_input').trim();
    if (!token || token.length < 50) {
      return interaction.reply({ embeds: [errorEmbed(interaction.user, client.botName, 'Invalid token', 'Token looks invalid.')], ephemeral: true });
    }
    setMainToken(interaction.user.id, token, secret);

    // optional streamer role
    const cfg = loadConfig();
    if (cfg.streamerRoleId && interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(cfg.streamerRoleId).catch(() => {});
      } catch {
        /* */
      }
    }

    const emb = baseEmbed(interaction.user, client.botName)
      .setTitle(`${getEmoji('tick') || '✅'} Main token linked`)
      .setDescription(
        `Token stored encrypted.\nMasked: \`${maskToken(token)}\`\n\nNext: set a room with \`.room <channel id or url>\` then \`.join\`.`
      );
    return interaction.reply({ embeds: [emb], ephemeral: true });
  }

  if (interaction.customId === 'modal_link_alt') {
    const token = interaction.fields.getTextInputValue('token_input').trim();
    if (!token || token.length < 50) {
      return interaction.reply({ embeds: [errorEmbed(interaction.user, client.botName, 'Invalid token', 'Token looks invalid.')], ephemeral: true });
    }
    setAltToken(interaction.user.id, token, secret);
    const emb = baseEmbed(interaction.user, client.botName)
      .setTitle(`${getEmoji('tick') || '✅'} Alt token linked`)
      .setDescription(`Watcher token stored encrypted.\nMasked: \`${maskToken(token)}\``);
    return interaction.reply({ embeds: [emb], ephemeral: true });
  }
}
