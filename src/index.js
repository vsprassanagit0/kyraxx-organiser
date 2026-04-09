require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Options, ChannelType } = require('discord.js');
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
    Partials.Channel,  // Required for DM reception
    Partials.Message,
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
      interval: 300,   // Sweep every 5 minutes
      lifetime: 600,   // Remove messages older than 10 minutes
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

  // Combine content from all messages
  const combinedContent = messages.map(m => m.content).filter(Boolean).join('\n\n');

  // Collect all attachments
  const allAttachments = messages.flatMap(m => [...m.attachments.values()]);

  // Parse with the first message for forwarded detection
  const parsed = parseMessage(combinedContent, allAttachments, messages[0]);

  // Check if there's anything to organise
  if (parsed.contentTypes.length === 0 && !parsed.forwarded) {
    try {
      await messages[0].reply('\u2753 I couldn\'t find anything to organise. Send me links, text, code, or files!');
    } catch { /* DM might be closed */ }
    return;
  }

  try {
    // Route to the correct server channel
    const result = await routeContent(client, parsed, user);

    // React to each original message with checkmark
    for (const msg of messages) {
      try { await msg.react('\u2705'); } catch { /* ignore */ }
    }

    // Build confirmation summary
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

// ── Event: messageCreate ────────────────────────────────────────────────────

// Debug: log ALL incoming messages
client.on('messageCreate', async (message) => {
  console.log(`[KYRAXX] Message received | type: ${message.channel.type} | author: ${message.author?.tag} (${message.author?.id}) | bot: ${message.author?.bot} | content: ${message.content?.slice(0, 50)}`);

  if (message.author.bot) return;
  if (message.channel.type !== ChannelType.DM) return;

  console.log(`[KYRAXX] DM from owner check: ${message.author.id} === ${OWNER_ID} => ${message.author.id === OWNER_ID}`);

  // Owner-only
  if (message.author.id !== OWNER_ID) {
    try {
      await message.reply('\uD83D\uDD12 This bot is private.');
    } catch { /* ignore */ }
    return;
  }

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

  // Buffer for batch processing
  bufferMessage(message);
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

// ── Login ───────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
