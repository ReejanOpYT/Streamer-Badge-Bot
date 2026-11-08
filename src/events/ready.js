'use strict';

const { ensureApplicationEmojis } = require('../utils/emojiManager');
const { refreshSticky } = require('../utils/stickyManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[+] Logged in as ${client.user.tag} (${client.botName})`);
    client.user.setPresence({
      activities: [{ name: `${client.prefix}help | ${client.botName}`, type: 3 }],
      status: 'online',
    });

    try {
      await ensureApplicationEmojis(client);
    } catch (err) {
      console.warn('[emoji] upload error:', err.message);
    }

    // initial sticky
    try {
      await refreshSticky(client);
    } catch {
      /* */
    }
  },
};
