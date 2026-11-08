'use strict';

const { sessionManager } = require('../utils/streamClient');
const { successEmbed, replyEmbed } = require('../utils/helpers');

module.exports = {
  name: 'stopall',
  ownerOnly: true,
  description: 'Stop all active sessions',
  async execute(message, args, client) {
    const n = sessionManager.sessions.size;
    await sessionManager.stopAll();
    return replyEmbed(
      message,
      successEmbed(message.author, client.botName, 'stopall', `Stopped **${n}** session(s).`)
    );
  },
};
