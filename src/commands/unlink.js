'use strict';

const { deleteUser } = require('../utils/dataStore');
const { sessionManager } = require('../utils/streamClient');
const { successEmbed, replyEmbed } = require('../utils/helpers');

module.exports = {
  name: 'unlink',
  description: 'Remove stored tokens',
  async execute(message, args, client) {
    const userId = message.author.id;
    if (sessionManager.has(userId)) {
      await sessionManager.stopSession(userId);
    }
    deleteUser(userId);
    return replyEmbed(
      message,
      successEmbed(
        message.author,
        client.botName,
        'Unlinked',
        'All stored tokens and room settings for you have been removed.'
      )
    );
  },
};
