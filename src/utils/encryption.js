'use strict';

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(secret) {
  // Derive a stable 32-byte key from the env string
  return crypto.createHash('sha256').update(String(secret || '')).digest();
}

/**
 * Encrypt a string. Returns base64(iv + tag + ciphertext)
 */
function encrypt(plainText, secret) {
  if (!plainText) return '';
  const key = getKey(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Decrypt base64 payload produced by encrypt()
 */
function decrypt(payload, secret) {
  if (!payload) return '';
  try {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < IV_LEN + TAG_LEN + 1) return '';
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = buf.subarray(IV_LEN + TAG_LEN);
    const key = getKey(secret);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Mask a token for logging / display: first 10 + last 4
 */
function maskToken(token) {
  if (!token || typeof token !== 'string') return 'not set';
  const t = token.trim();
  if (t.length <= 14) return '***';
  return `${t.slice(0, 10)}...${t.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskToken };
