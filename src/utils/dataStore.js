'use strict';

const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./encryption');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const EMOJI_CACHE = path.join(DATA_DIR, 'emojis.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback = {}) {
  ensureDir();
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return typeof fallback === 'function' ? fallback() : structuredClone(fallback);
}

function writeJson(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/* -------------------- Config -------------------- */
function loadConfig() {
  return readJson(CONFIG_FILE, {
    stickyChannelId: null,
    stickyMessageId: null,
    stickyLine: 'Put Server Vanity In Status to Get access',
    defaultVcId: null,
    streamerRoleId: null,
    allowedCommandChannels: [],
  });
}

function saveConfig(cfg) {
  writeJson(CONFIG_FILE, cfg);
}

/* -------------------- Users -------------------- */
function loadUsers() {
  return readJson(USERS_FILE, {});
}

function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

/**
 * Get user record. Tokens are stored encrypted.
 */
function getUser(userId) {
  const users = loadUsers();
  const u = users[userId] || {
    mainTokenEnc: '',
    altTokenEnc: '',
    roomInput: '',
    guildId: null,
    channelId: null,
    channelName: '',
    totalSeconds: 0,
    linkedAt: null,
  };
  return u;
}

function setUser(userId, partial) {
  const users = loadUsers();
  users[userId] = { ...getUser(userId), ...partial };
  saveUsers(users);
  return users[userId];
}

function deleteUser(userId) {
  const users = loadUsers();
  delete users[userId];
  saveUsers(users);
}

function getDecryptedTokens(userId, secret) {
  const u = getUser(userId);
  return {
    main: decrypt(u.mainTokenEnc, secret),
    alt: decrypt(u.altTokenEnc, secret),
  };
}

function setMainToken(userId, token, secret) {
  setUser(userId, {
    mainTokenEnc: encrypt(token, secret),
    linkedAt: Date.now(),
  });
}

function setAltToken(userId, token, secret) {
  setUser(userId, {
    altTokenEnc: token ? encrypt(token, secret) : '',
  });
}

/* -------------------- Emoji cache -------------------- */
function loadEmojiCache() {
  return readJson(EMOJI_CACHE, {});
}

function saveEmojiCache(map) {
  writeJson(EMOJI_CACHE, map);
}

module.exports = {
  loadConfig,
  saveConfig,
  loadUsers,
  saveUsers,
  getUser,
  setUser,
  deleteUser,
  getDecryptedTokens,
  setMainToken,
  setAltToken,
  loadEmojiCache,
  saveEmojiCache,
  DATA_DIR,
};
