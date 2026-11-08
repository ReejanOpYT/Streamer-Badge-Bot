'use strict';

const { onMessageInStickyChannel } = require('../utils/stickyManager');
const {
  isOwner,
  isCommandChannelAllowed,
  errorEmbed,
  replyEmbed,
  getEmoji,
} = require('../utils/helpers');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) {
      await onMessageInStickyChannel(client, message);
      return;
    }

    await onMessageInStickyChannel(client, message);

    const prefix = client.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const name = (args.shift() || '').toLowerCase();
    if (!name) return;

    const cmd = client.commands.get(name);
    if (!cmd) return;

    // Channel restriction (owners bypass)
    if (!isCommandChannelAllowed(message.channel.id, message.author.id)) {
      const emb = errorEmbed(
        message.author,
        client.botName,
        'Wrong channel',
        `Commands can only be used in the channel(s) set by the owner.\nAsk an owner to run \`.setcmdchannel\` here or check the allowed list.`
      );
      return replyEmbed(message, emb).catch(() => {});
    }

    if (cmd.ownerOnly && !isOwner(message.author.id)) {
      const emb = errorEmbed(message.author, client.botName, 'Owner only', 'This command is restricted to bot owners.');
      return replyEmbed(message, emb).catch(() => {});
    }

    try {
      await cmd.execute(message, args, client);
    } catch (err) {
      console.error(`[cmd ${name}]`, err);
      const emb = errorEmbed(
        message.author,
        client.botName,
        'Error',
        err.message || 'Something went wrong.'
      );
      replyEmbed(message, emb).catch(() => {});
    }
  },
};
