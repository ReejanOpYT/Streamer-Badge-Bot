'use strict';

/**
 * Discord user-token Go Live / screen-share client (gateway + voice/stream WS).
 * Ports the pure-Python spoofer logic:
 *   op 4  → join voice
 *   op 18 → create stream (Go Live)
 *   op 22 → set paused = false
 *   op 20 → watch stream (alt)
 * Heartbeats on gateway + RTC sockets. Auto-reconnect.
 */

const WebSocket = require('ws');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');
const EventEmitter = require('events');

const DISCORD_API = 'https://discord.com/api/v10';
const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9168 Chrome/128.0.6613.186 Electron/32.2.2 Safari/537.36';

function makeSuperProperties() {
  const props = {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: '1.0.9168',
    os_version: '10.0.22631',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'en-US',
    browser_user_agent: USER_AGENT,
    browser_version: '32.2.2',
    client_build_number: 343349,
    native_build_number: 53915,
    client_event_source: null,
  };
  return Buffer.from(JSON.stringify(props)).toString('base64');
}

function apiGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DISCORD_API}${endpoint}`);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          Authorization: token.trim(),
          'User-Agent': USER_AGENT,
          'X-Super-Properties': makeSuperProperties(),
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          } else {
            const err = new Error(`HTTP ${res.statusCode}`);
            err.statusCode = res.statusCode;
            err.body = body;
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

/**
 * Parse channel URL or raw ID → { guildId, channelId, channelName }
 */
async function parseRoomInput(raw, token) {
  const text = String(raw || '').trim();
  let guildId = null;
  let channelId = null;

  const urlMatch = text.match(/discord(?:app)?\.com\/channels\/(@me|\d+)\/(\d+)/i);
  if (urlMatch) {
    guildId = urlMatch[1] === '@me' ? null : urlMatch[1];
    channelId = urlMatch[2];
  } else {
    const pair = text.match(/^(\d{15,22})[:/\s]+(\d{15,22})$/);
    if (pair) {
      guildId = pair[1];
      channelId = pair[2];
    } else {
      const idOnly = text.match(/(\d{15,22})/);
      if (!idOnly) throw new Error('Invalid room ID or URL');
      channelId = idOnly[1];
    }
  }

  try {
    const ch = await apiGet(`/channels/${channelId}`, token);
    return {
      guildId: ch.guild_id || guildId,
      channelId: String(channelId),
      channelName: ch.name || `Channel ${channelId}`,
    };
  } catch (err) {
    if (err.statusCode === 401) throw new Error('Invalid token (401)');
    if (err.statusCode === 403) throw new Error('No access to channel (403)');
    if (err.statusCode === 404) throw new Error('Channel not found (404)');
    // fall back with what we have
    return {
      guildId,
      channelId: String(channelId),
      channelName: `Channel ${channelId}`,
    };
  }
}

/* -------------------- Lightweight WS wrapper -------------------- */
class DiscordWS extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.closed = true;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url, {
        headers: {
          'User-Agent': USER_AGENT,
          Origin: 'https://discord.com',
        },
      });
      this.ws.on('open', () => {
        this.closed = false;
        resolve();
      });
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.emit('json', msg);
        } catch {
          /* binary / ignore */
        }
      });
      this.ws.on('close', (code) => {
        this.closed = true;
        this.emit('close', code);
      });
      this.ws.on('error', (err) => {
        this.emit('error', err);
        if (this.closed) reject(err);
      });
    });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  close() {
    this.closed = true;
    try {
      if (this.ws) this.ws.close(1000);
    } catch {
      /* */
    }
  }
}

/* -------------------- RTC (voice / stream) keep-alive -------------------- */
class RTCVoiceSession {
  constructor({ label, endpoint, serverId, channelId, userId, sessionId, voiceToken, isStream }) {
    this.label = label;
    this.endpoint = endpoint;
    this.serverId = serverId;
    this.channelId = channelId;
    this.userId = userId;
    this.sessionId = sessionId;
    this.voiceToken = voiceToken;
    this.isStream = isStream;
    this.ws = null;
    this.running = false;
    this._hb = null;
  }

  start() {
    this.running = true;
    this._run().catch(() => {});
  }

  async stop() {
    this.running = false;
    if (this._hb) clearInterval(this._hb);
    if (this.ws) this.ws.close();
  }

  async _run() {
    let url = this.endpoint;
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) url = `wss://${url}`;
    if (!url.includes('?v=')) url = `${url.replace(/\/$/, '')}/?v=8`;

    try {
      this.ws = new DiscordWS(url);
      await this.ws.connect();

      this.ws.send({
        op: 0,
        d: {
          server_id: String(this.serverId),
          channel_id: String(this.channelId),
          user_id: String(this.userId),
          session_id: this.sessionId,
          token: this.voiceToken,
          video: true,
          streams: [
            {
              type: this.isStream ? 'screen' : 'video',
              rid: '100',
              quality: 100,
            },
          ],
        },
      });

      this.ws.on('json', (msg) => {
        if (!this.running) return;
        const op = msg.op;
        const d = msg.d || {};

        if (op === 8) {
          // Hello
          const interval = (d.heartbeat_interval || 15000) / 1000;
          if (this._hb) clearInterval(this._hb);
          this._hb = setInterval(() => {
            if (!this.running || !this.ws || this.ws.closed) return;
            this.ws.send({ op: 3, d: { t: Date.now(), seq_ack: -1 } });
          }, interval * 1000);
        } else if (op === 2) {
          // Ready
          const modes = d.modes || ['aead_xchacha20_poly1305_rtpsize'];
          const selected =
            modes.includes('aead_aes256_gcm_rtpsize') ? 'aead_aes256_gcm_rtpsize' : modes[0];
          this.ws.send({
            op: 1,
            d: {
              protocol: 'udp',
              data: {
                address: d.ip || '127.0.0.1',
                port: d.port || 1337,
                mode: selected,
              },
              codecs: [
                { name: 'opus', type: 'audio', priority: 1000, payload_type: 120 },
                {
                  name: 'H264',
                  type: 'video',
                  priority: 1000,
                  payload_type: 101,
                  rtx_payload_type: 102,
                  encode: true,
                  decode: true,
                },
              ],
              rtc_connection_id: crypto.randomUUID(),
            },
          });

          const streams = d.streams || [];
          const ssrc = d.ssrc || 1;
          const videoSsrc = streams[0]?.ssrc || ssrc + 1;
          const rtxSsrc = streams[0]?.rtx_ssrc || videoSsrc + 1;
          this.ws.send({
            op: 12,
            d: {
              audio_ssrc: ssrc,
              video_ssrc: videoSsrc,
              rtx_ssrc: rtxSsrc,
              streams: [
                {
                  type: 'video',
                  rid: '100',
                  ssrc: videoSsrc,
                  active: true,
                  quality: 100,
                  rtx_ssrc: rtxSsrc,
                  max_bitrate: 2500000,
                  max_framerate: 30,
                  max_resolution: { type: 'fixed', width: 1280, height: 720 },
                },
              ],
            },
          });
        }
      });
    } catch {
      /* silent reconnect is handled by parent */
    }
  }
}

/* -------------------- Main Gateway Client -------------------- */
class DiscordStreamClient extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string} opts.token
   * @param {string|null} opts.guildId
   * @param {string} opts.channelId
   * @param {'streamer'|'viewer'} opts.role
   * @param {boolean} [opts.selfMute]
   * @param {boolean} [opts.selfDeaf]
   * @param {boolean} [opts.selfVideo]
   */
  constructor(opts) {
    super();
    this.token = opts.token.trim();
    this.guildId = opts.guildId || null;
    this.channelId = String(opts.channelId);
    this.role = opts.role || 'streamer';
    this.selfMute = opts.selfMute !== false;
    this.selfDeaf = opts.selfDeaf !== false;
    this.selfVideo = !!opts.selfVideo;

    this.ws = null;
    this.seq = null;
    this.userId = null;
    this.username = 'Unknown';
    this.voiceSessionId = null;
    this.streamKey = null;
    this.streamActive = false;
    this.running = false;
    this.voiceRtc = null;
    this.streamRtc = null;
    this._hb = null;
    this._refresh = null;
    this._backoff = 3;
  }

  buildStreamKey(targetUserId) {
    const uid = targetUserId || this.userId;
    if (this.guildId) return `guild:${this.guildId}:${this.channelId}:${uid}`;
    return `call:${this.channelId}:${uid}`;
  }

  async start() {
    this.running = true;
    this._loop();
  }

  async stop() {
    this.running = false;
    if (this._hb) clearInterval(this._hb);
    if (this._refresh) clearInterval(this._refresh);
    if (this.ws && !this.ws.closed) {
      try {
        if (this.role === 'streamer' && this.streamKey) {
          this.ws.send({ op: 19, d: { stream_key: this.streamKey } });
        }
        this.ws.send({
          op: 4,
          d: {
            guild_id: this.guildId,
            channel_id: null,
            self_mute: true,
            self_deaf: true,
            self_video: false,
          },
        });
      } catch {
        /* */
      }
      this.ws.close();
    }
    if (this.voiceRtc) await this.voiceRtc.stop();
    if (this.streamRtc) await this.streamRtc.stop();
    this.emit('stopped');
  }

  async _loop() {
    while (this.running) {
      try {
        await this._connectAndListen();
      } catch (err) {
        if (!this.running) break;
        this.emit('error', err);
        await sleep(this._backoff * 1000);
        this._backoff = Math.min(this._backoff * 2, 30);
      }
    }
  }

  async _connectAndListen() {
    this.ws = new DiscordWS(GATEWAY_URL);
    await this.ws.connect();
    this._backoff = 3;

    return new Promise((resolve, reject) => {
      const onClose = () => {
        cleanup();
        if (this.running) reject(new Error('gateway closed'));
        else resolve();
      };
      const onError = (e) => {
        cleanup();
        reject(e);
      };
      const cleanup = () => {
        this.ws.off('close', onClose);
        this.ws.off('error', onError);
        this.ws.off('json', onJson);
        if (this._hb) clearInterval(this._hb);
        if (this._refresh) clearInterval(this._refresh);
      };

      const onJson = async (msg) => {
        if (!this.running) return;
        const op = msg.op;
        const t = msg.t;
        const s = msg.s;
        const d = msg.d;

        if (s != null) this.seq = s;

        if (op === 10) {
          const interval = ((d && d.heartbeat_interval) || 41250) / 1000;
          if (this._hb) clearInterval(this._hb);
          this._hb = setInterval(() => {
            if (this.ws && !this.ws.closed) this.ws.send({ op: 1, d: this.seq });
          }, interval * 1000);
          this._sendIdentify();
        } else if (op === 1) {
          this.ws.send({ op: 1, d: this.seq });
        } else if (op === 7 || op === 9) {
          this.ws.close();
          reject(new Error(`gateway op ${op}`));
        } else if (op === 0) {
          await this._handleDispatch(t, d || {});
        }
      };

      this.ws.on('json', onJson);
      this.ws.on('close', onClose);
      this.ws.on('error', onError);
    });
  }

  _sendIdentify() {
    this.ws.send({
      op: 2,
      d: {
        token: this.token,
        capabilities: 16381,
        properties: {
          os: 'Windows',
          browser: 'Discord Client',
          release_channel: 'stable',
          client_version: '1.0.9168',
          os_version: '10.0.22631',
          os_arch: 'x64',
          app_arch: 'x64',
          system_locale: 'en-US',
          browser_user_agent: USER_AGENT,
          browser_version: '32.2.2',
          client_build_number: 343349,
          native_build_number: 53915,
          client_event_source: null,
        },
        presence: { status: 'online', since: 0, activities: [], afk: false },
        compress: false,
        client_state: {
          guild_versions: {},
          highest_last_message_id: '0',
          read_state_version: 0,
          user_guild_settings_version: -1,
          user_settings_version: -1,
          private_channels_version: '0',
          api_code_version: 0,
        },
      },
    });
  }

  async _handleDispatch(eventName, d) {
    if (eventName === 'READY') {
      const user = d.user || {};
      this.userId = user.id;
      this.username = user.username || 'User';
      this.voiceSessionId = d.session_id;
      this.emit('ready', { userId: this.userId, username: this.username });

      await this.joinVoiceChannel();
      if (this.role === 'streamer') {
        await sleep(1200);
        await this.startScreenShare();
        if (this._refresh) clearInterval(this._refresh);
        this._refresh = setInterval(() => {
          if (this.streamKey) this.setStreamPaused(false);
        }, 60000);
      }
    } else if (eventName === 'VOICE_STATE_UPDATE') {
      if (String(d.user_id) === String(this.userId)) {
        this.voiceSessionId = d.session_id || this.voiceSessionId;
        if (d.channel_id == null && this.running) {
          await sleep(3000);
          await this.joinVoiceChannel();
          if (this.role === 'streamer') {
            await sleep(1000);
            await this.startScreenShare();
          }
        }
      }
    } else if (eventName === 'VOICE_SERVER_UPDATE') {
      const endpoint = d.endpoint;
      const voiceToken = d.token;
      const serverId = d.guild_id || d.channel_id || this.channelId;
      if (endpoint && voiceToken && this.userId && this.voiceSessionId) {
        if (this.voiceRtc) await this.voiceRtc.stop();
        this.voiceRtc = new RTCVoiceSession({
          label: `Voice-${this.username}`,
          endpoint,
          serverId: String(serverId),
          channelId: this.channelId,
          userId: this.userId,
          sessionId: this.voiceSessionId,
          voiceToken,
          isStream: false,
        });
        this.voiceRtc.start();
      }
    } else if (eventName === 'STREAM_CREATE') {
      const sKey = d.stream_key;
      if (sKey) {
        this.streamKey = sKey;
        this.streamActive = true;
        this.emit('streamCreate', sKey);
        if (this.role === 'streamer') {
          await this.setStreamPaused(false);
        }
      }
    } else if (eventName === 'STREAM_SERVER_UPDATE') {
      const endpoint = d.endpoint;
      const streamToken = d.token;
      const sKey = d.stream_key || this.streamKey;
      if (endpoint && streamToken && this.userId && this.voiceSessionId && sKey) {
        if (this.streamRtc) await this.streamRtc.stop();
        this.streamRtc = new RTCVoiceSession({
          label: `Stream-${this.username}`,
          endpoint,
          serverId: String(this.guildId || this.channelId),
          channelId: this.channelId,
          userId: this.userId,
          sessionId: this.voiceSessionId,
          voiceToken: streamToken,
          isStream: true,
        });
        this.streamRtc.start();
      }
    } else if (eventName === 'STREAM_DELETE') {
      if (this.role === 'streamer' && this.running) {
        this.streamActive = false;
        this.emit('streamDelete', d.reason);
        await sleep(2500);
        await this.startScreenShare();
      }
    }
  }

  async joinVoiceChannel() {
    if (!this.ws || this.ws.closed) return;
    this.ws.send({
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: this.channelId,
        self_mute: this.selfMute,
        self_deaf: this.selfDeaf,
        self_video: this.selfVideo,
      },
    });
    this.emit('joiningVoice');
  }

  async startScreenShare() {
    if (!this.ws || this.ws.closed || !this.userId) return;
    const streamType = this.guildId ? 'guild' : 'call';
    this.ws.send({
      op: 18,
      d: {
        type: streamType,
        guild_id: this.guildId,
        channel_id: this.channelId,
        preferred_region: null,
      },
    });
    this.streamKey = this.buildStreamKey();
    await sleep(500);
    await this.setStreamPaused(false);
  }

  async setStreamPaused(paused = false) {
    if (!this.ws || this.ws.closed || !this.userId) return;
    const sKey = this.streamKey || this.buildStreamKey();
    this.ws.send({
      op: 22,
      d: { stream_key: sKey, paused },
    });
  }

  async watchStream(targetStreamKey) {
    if (!this.ws || this.ws.closed) return;
    this.ws.send({
      op: 20,
      d: { stream_key: targetStreamKey },
    });
    this.emit('watching', targetStreamKey);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* -------------------- Session Manager (per Discord user) -------------------- */
class SessionManager {
  constructor() {
    /** @type {Map<string, {streamer: DiscordStreamClient, viewer?: DiscordStreamClient, startedAt: number, userId: string}>} */
    this.sessions = new Map();
  }

  has(userId) {
    return this.sessions.has(userId);
  }

  get(userId) {
    return this.sessions.get(userId);
  }

  list() {
    return [...this.sessions.entries()].map(([uid, s]) => ({
      userId: uid,
      username: s.streamer?.username || '?',
      streamActive: !!s.streamer?.streamActive,
      startedAt: s.startedAt,
      hasViewer: !!s.viewer,
    }));
  }

  async startSession({ userId, mainToken, altToken, guildId, channelId, channelName }) {
    if (this.sessions.has(userId)) {
      await this.stopSession(userId);
    }

    const streamer = new DiscordStreamClient({
      token: mainToken,
      guildId,
      channelId,
      role: 'streamer',
      selfMute: true,
      selfDeaf: true,
      selfVideo: false,
    });

    let viewer = null;
    if (altToken) {
      viewer = new DiscordStreamClient({
        token: altToken,
        guildId,
        channelId,
        role: 'viewer',
        selfMute: true,
        selfDeaf: true,
        selfVideo: false,
      });
    }

    const entry = {
      streamer,
      viewer,
      startedAt: Date.now(),
      userId,
      guildId,
      channelId,
      channelName,
    };
    this.sessions.set(userId, entry);

    streamer.on('streamCreate', async (key) => {
      if (viewer) {
        // wait for viewer ready then watch
        const tryWatch = async () => {
          if (viewer.userId) {
            await sleep(1500);
            await viewer.watchStream(key);
          } else {
            viewer.once('ready', async () => {
              await sleep(1500);
              await viewer.watchStream(key);
            });
          }
        };
        tryWatch().catch(() => {});
      }
    });

    streamer.start().catch(() => {});
    if (viewer) viewer.start().catch(() => {});

    return entry;
  }

  async stopSession(userId) {
    const entry = this.sessions.get(userId);
    if (!entry) return;
    this.sessions.delete(userId);
    await entry.streamer.stop().catch(() => {});
    if (entry.viewer) await entry.viewer.stop().catch(() => {});
  }

  async stopAll() {
    const ids = [...this.sessions.keys()];
    for (const id of ids) await this.stopSession(id);
  }

  /**
   * Accrue hours for a running session into the data store.
   */
  tickHours(userId, setUserFn) {
    const entry = this.sessions.get(userId);
    if (!entry) return;
    // hours are tracked externally by the bot on interval; this is just a helper
  }
}

const sessionManager = new SessionManager();

module.exports = {
  DiscordStreamClient,
  SessionManager,
  sessionManager,
  parseRoomInput,
  apiGet,
  maskToken: require('./encryption').maskToken,
};
