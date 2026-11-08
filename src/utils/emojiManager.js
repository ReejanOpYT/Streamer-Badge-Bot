'use strict';

const fs = require('fs');
const path = require('path');
const { loadEmojiCache, saveEmojiCache } = require('./dataStore');

const EMOJI_DIR = path.join(__dirname, '..', '..', 'emojis');

function toEmojiName(filename) {
  let name = path.basename(filename, path.extname(filename));
  name = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (name.length < 2) name = `e_${name || 'x'}`;
  if (name.length > 32) name = name.slice(0, 32);
  return name;
}

function isAnimatedExt(filename) {
  return path.extname(filename).toLowerCase() === '.gif';
}

/**
 * Normalize cache entry → { id, animated }
 */
function normalizeEntry(val) {
  if (!val) return null;
  if (typeof val === 'string') return { id: val, animated: false };
  if (val.id) return { id: String(val.id), animated: !!val.animated };
  return null;
}

async function ensureApplicationEmojis(client) {
  const cache = loadEmojiCache();
  const app = client.application;
  if (!app) return cache;

  let existing;
  try {
    existing = await app.emojis.fetch();
  } catch (err) {
    console.warn('[emoji] Could not fetch application emojis:', err.message);
    return cache;
  }

  const existingByName = new Map();
  for (const e of existing.values()) {
    existingByName.set(e.name, e);
    cache[e.name] = { id: e.id, animated: !!e.animated };
  }

  if (!fs.existsSync(EMOJI_DIR)) {
    console.warn('[emoji] emojis/ folder missing');
    saveEmojiCache(cache);
    return cache;
  }

  const files = fs.readdirSync(EMOJI_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
  });

  let uploaded = 0;
  for (const file of files) {
    const name = toEmojiName(file);
    if (existingByName.has(name)) {
      const e = existingByName.get(name);
      cache[name] = { id: e.id, animated: !!e.animated };
      continue;
    }
    if (cache[name] && normalizeEntry(cache[name])) continue;

    const filePath = path.join(EMOJI_DIR, file);
    try {
      const emoji = await app.emojis.create({ attachment: filePath, name });
      cache[name] = { id: emoji.id, animated: isAnimatedExt(file) || !!emoji.animated };
      existingByName.set(name, emoji);
      uploaded++;
      console.log(`[emoji] uploaded ${name}`);
      await new Promise((r) => setTimeout(r, 350));
    } catch (err) {
      console.warn(`[emoji] failed ${name}: ${err.message}`);
    }
  }

  saveEmojiCache(cache);
  if (uploaded > 0) console.log(`[emoji] uploaded ${uploaded} new application emojis`);
  return cache;
}

const ALIASES = {
  link: 'link69',
  book: 'book_',
  cross: 'Cross_',
  tick: 'tick_pd',
  trophy: 'SunTrophy',
  gear: 'Gear',
  security: 'security',
  join: 'join',
  robot: 'robot',
  tools: 'Tools',
  star: 'Star',
  ping: 'ping',
  auth: 'auth-1',
};

/**
 * Return Discord markdown emoji string for embeds/messages.
 */
function getEmoji(name, fallback = '') {
  const cache = loadEmojiCache();
  const tryNames = [name, ALIASES[name], ALIASES[String(name).toLowerCase()]].filter(Boolean);

  for (const n of tryNames) {
    const entry = normalizeEntry(cache[n]);
    if (entry) {
      return entry.animated ? `<a:${n}:${entry.id}>` : `<:${n}:${entry.id}>`;
    }
  }
  return fallback || '';
}

/**
 * Object for ButtonBuilder.setEmoji() — always returns something usable.
 */
function resolveButtonEmoji(name, unicodeFallback = '🔹') {
  const cache = loadEmojiCache();
  const tryNames = [name, ALIASES[name], ALIASES[String(name).toLowerCase()]].filter(Boolean);

  for (const n of tryNames) {
    const entry = normalizeEntry(cache[n]);
    if (entry) {
      return { id: entry.id, name: n, animated: entry.animated };
    }
  }
  return unicodeFallback;
}

module.exports = {
  ensureApplicationEmojis,
  getEmoji,
  resolveButtonEmoji,
  toEmojiName,
};
