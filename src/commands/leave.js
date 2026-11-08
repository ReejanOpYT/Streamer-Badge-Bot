'use strict';

const { sessionManager } = require('../utils/streamClient');
const { successEmbed, errorEmbed, replyEmbed } = require('../utils/helpers');

module.exports = {
  name: 'leave',
  description: 'Stop stream and disconnect alt',
  async execute(message, args, client) {
    const userId = message.author.id;
    if (!sessionManager.has(userId)) {
      return replyEmbed(
        message,
        errorEmbed(message.author, client.botName, 'No session', 'No active session.')
      );
    }
    await sessionManager.stopSession(userId);
    return replyEmbed(
      message,
      successEmbed(
        message.author,
        client.botName,
        'Session stopped',
        'Main left voice / stream ended. Alt disconnected. Progress is saved.'
      )
    );
  },
};
