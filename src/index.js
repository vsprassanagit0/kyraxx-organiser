require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Options, ChannelType, Collection } = require('discord.js');
const { parseMessage } = require('./parser');
const { routeContent } = require('./router');
const { handleCommand } = require('./commands');
const db = require('./db');

// ── Validate required env vars ──────────────────────────────────────────────

const REQUIRED_ENV = ['DISCORD_TOKEN', 'GUILD_ID', 'OWNER_ID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[KYRAXX] Missing required env var: ${key}`);
    process.exit(1);
  }
}

const OWNER_ID = process.env.OWNER_ID;

// ── Client setup with aggressive cache limits ──────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 10,
    GuildMemberManager: 0,
    ReactionManager: 0,
    PresenceManager: 0,
    VoiceStateManager: 0,
    ThreadManager: 0,
    GuildEmojiManager: 0,
    GuildStickerManager: 0,
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 300,
      lifetime: 600,
    },
  },
});

// ── Message batching (3s debounce per user) ─────────────────────────────────

const userBuffers = new Map();
const BATCH_DELAY = 3000;

function bufferMessage(message) {
  const userId = message.author.id;

  if (!userBuffers.has(userId)) {
    userBuffers.set(userId, { messages: [], timer: null });
  }

  const buffer = userBuffers.get(userId);
  buffer.messages.push(message);

  if (buffer.timer) clearTimeout(buffer.timer);

  buffer.timer = setTimeout(() => {
    const messages = buffer.messages;
    userBuffers.delete(userId);
    processBatch(messages);
  }, BATCH_DELAY);
}

async function processBatch(messages) {
  if (!messages.length) return;

  const user = messages[0].author;

  const combinedContent = messages.map(m => m.content).filter(Boolean).join('\n\n');
  const allAttachments = messages.flatMap(m => [...m.attachments.values()]);

  const parsed = parseMessage(combinedContent, allAttachments, messages[0]);

  if (parsed.contentTypes.length === 0 && !parsed.forwarded) {
    try {
      await messages[0].reply('\u2753 I couldn\'t find anything to organise. Send me links, text, code, or files!');
    } catch { /* DM might be closed */ }
    return;
  }

  try {
    const result = await routeContent(client, parsed, user);

    for (const msg of messages) {
      try { await msg.react('\u2705'); } catch { /* ignore */ }
    }

    const parts = [];
    if (parsed.urls.length) parts.push(`\uD83D\uDD17 ${parsed.urls.length} link(s)`);
    if (parsed.contentTypes.includes('text')) parts.push('\uD83D\uDCDD text');
    if (parsed.codeBlocks.length) parts.push(`\uD83D\uDCBB ${parsed.codeBlocks.length} code`);
    if (parsed.attachments.length) parts.push(`\uD83D\uDCCE ${parsed.attachments.length} file(s)`);
    if (parsed.isPrompt) parts.push('\uD83E\uDD16 prompt');
    if (parsed.forwarded) parts.push('\uD83D\uDD04 forwarded');

    let reply = `\u2705 **Organised!**  ${parts.join('  \u2022  ')}`;
    if (result.filedTo) {
      reply += `\n\uD83D\uDCC2 Filed to: <#${result.filedTo}>  (${result.label})`;
    }
    if (result.errors.length) {
      reply += `\n\u26A0\uFE0F Errors: ${result.errors.join(', ')}`;
    }

    await messages[0].reply(reply);

  } catch (err) {
    console.error('[KYRAXX] Route error:', err.message);
    try {
      await messages[0].reply('\u274C Something went wrong. Please try again.');
    } catch { /* ignore */ }
  }
}

// ── DM handler ──────────────────────────────────────────────────────────────

async function handleDM(message) {
  if (message.author.bot) return;

  // Owner-only
  if (message.author.id !== OWNER_ID) {
    try {
      await message.reply('\uD83D\uDD12 This bot is private.');
    } catch { /* ignore */ }
    return;
  }

  console.log(`[KYRAXX] DM from ${message.author.tag}: ${message.content?.slice(0, 80)}`);

  // Command handling (instant, no batching)
  if (message.content.startsWith('!')) {
    try {
      await handleCommand(message);
    } catch (err) {
      console.error('[KYRAXX] Command error:', err.message);
      try { await message.reply('\u274C Command failed. Try `!help`.'); } catch { /* ignore */ }
    }
    return;
  }

  bufferMessage(message);
}

// ── Event: ready ────────────────────────────────────────────────────────────

client.once('ready', () => {
  const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  console.log('');
  console.log('  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('  \u2502  Kyraxx Organiser            \u2502');
  console.log('  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  console.log(`  \u2502  Bot:    ${client.user.tag.padEnd(24)}\u2502`);
  console.log(`  \u2502  Owner:  ${OWNER_ID.padEnd(24)}\u2502`);
  console.log(`  \u2502  Memory: ${(mem + 'MB').padEnd(24)}\u2502`);
  console.log('  \u2502  Status: Online               \u2502');
  console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
  console.log('');
});

// ── Event: messageCreate (primary handler) ──────────────────────────────────

client.on('messageCreate', async (message) => {
  // Handle partial channels (DMs)
  if (message.channel?.partial) {
    try { await message.channel.fetch(); } catch { return; }
  }

  if (message.channel.type === ChannelType.DM) {
    return handleDM(message);
  }
});

// ── Fallback: Raw event handler for DMs ─────────────────────────────────────
// discord.js sometimes fails to emit messageCreate for DM partials.
// This raw handler catches those cases reliably.

const handledMessages = new Set();

client.on('raw', async (event) => {
  if (event.t !== 'MESSAGE_CREATE') return;
  if (event.d.channel_type !== 1) return; // 1 = DM

  const msgId = event.d.id;

  // Skip if already handled by messageCreate
  // Give messageCreate 500ms to fire first
  setTimeout(async () => {
    if (handledMessages.has(msgId)) {
      handledMessages.delete(msgId);
      return;
    }

    console.log(`[KYRAXX] Raw DM fallback for message ${msgId}`);

    try {
      // Fetch the DM channel
      const channel = await client.channels.fetch(event.d.channel_id);
      if (!channel) return;

      // Fetch the actual message object
      const message = await channel.messages.fetch(msgId);
      if (!message) return;

      await handleDM(message);
    } catch (err) {
      console.error('[KYRAXX] Raw handler error:', err.message);
    }
  }, 500);
});

// Mark messages handled by the normal messageCreate path
const origHandleDM = handleDM;
const wrappedHandleDM = async (message) => {
  handledMessages.add(message.id);
  return origHandleDM(message);
};

// Override the messageCreate handler to mark handled
client.removeAllListeners('messageCreate');
client.on('messageCreate', async (message) => {
  if (message.channel?.partial) {
    try { await message.channel.fetch(); } catch { return; }
  }

  if (message.channel.type === ChannelType.DM) {
    handledMessages.add(message.id);
    return handleDM(message);
  }
});

// ── Graceful shutdown ───────────────────────────────────────────────────────

function shutdown() {
  console.log('\n[KYRAXX] Shutting down...');
  db.close();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => {
  console.error('[KYRAXX] Unhandled rejection:', err);
});

// ── Resource monitoring (every 10 min) ──────────────────────────────────────

setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[KYRAXX] Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
}, 600000);

// ── Cleanup handled message IDs (prevent memory leak) ───────────────────────

setInterval(() => {
  handledMessages.clear();
}, 60000);

// ── Login ───────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
