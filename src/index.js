require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Options, ChannelType, ActivityType } = require('discord.js');
const { parseMessage } = require('./parser');
const { routeContent } = require('./router');
const { handleCommand } = require('./commands');
const { formatAskLabel } = require('./formatter');
const { e } = require('./emojis');
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
const LABEL_TIMEOUT = 30000; // 30 seconds to reply with label

// ── Client setup ────────────────────────────────────────────────────────────

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

// ── State: track when we're waiting for a label ─────────────────────────────

const awaitingLabel = new Set(); // user IDs currently being prompted

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

// ── Ask for label, then organize ────────────────────────────────────────────

async function askAndOrganize(channel, parsed, user, messages) {
  // Send the "what's this about?" prompt
  const askEmbed = formatAskLabel(parsed);
  await channel.send({ embeds: [askEmbed] });

  // Mark that we're waiting for a label from this user
  awaitingLabel.add(user.id);

  // Wait for their reply
  let label = null;
  try {
    const filter = (m) => m.author.id === user.id && !m.author.bot;
    const collected = await channel.awaitMessages({
      filter,
      max: 1,
      time: LABEL_TIMEOUT,
      errors: ['time'],
    });

    const reply = collected.first();
    if (reply && reply.content.toLowerCase() !== 'skip') {
      label = reply.content.trim();
    }
  } catch {
    // Timeout - no label provided, continue without
  }

  awaitingLabel.delete(user.id);
  return label;
}

// ── Process batch ───────────────────────────────────────────────────────────

async function processBatch(messages) {
  if (!messages.length) return;

  const user = messages[0].author;
  const channel = messages[0].channel;

  const combinedContent = messages.map(m => m.content).filter(Boolean).join('\n\n');
  const allAttachments = messages.flatMap(m => [...m.attachments.values()]);

  const parsed = parseMessage(combinedContent, allAttachments, messages[0]);

  if (parsed.contentTypes.length === 0 && !parsed.forwarded) {
    try {
      await messages[0].reply('\u2753 I couldn\'t find anything to organise. Send me links, text, code, or files!');
    } catch { /* ignore */ }
    return;
  }

  try {
    // Ask for a label
    const label = await askAndOrganize(channel, parsed, user, messages);

    // Route to the correct server channel
    const result = await routeContent(client, parsed, user, label);

    // React to original messages
    for (const msg of messages) {
      try { await msg.react('\u2705'); } catch { /* ignore */ }
    }

    // Confirmation
    const parts = [];
    if (parsed.urls.length) parts.push(`${e('k_link')} ${parsed.urls.length} link(s)`);
    if (parsed.contentTypes.includes('text')) parts.push(`${e('k_note')} text`);
    if (parsed.codeBlocks.length) parts.push(`${e('k_code')} ${parsed.codeBlocks.length} code`);
    if (parsed.attachments.length) parts.push(`${e('k_media')} ${parsed.attachments.length} file(s)`);
    if (parsed.isPrompt) parts.push(`${e('k_prompt')} prompt`);
    if (parsed.forwarded) parts.push(`${e('k_forward')} forwarded`);

    let reply = `${e('k_success')} **Organised!**  ${parts.join('  \u2022  ')}`;
    if (label) reply += `\n${e('k_pin')} Label: **"${label}"**`;
    if (result.filedTo) {
      reply += `\n${e('k_inbox')} Filed to: <#${result.filedTo}>  (${result.label})`;
    }
    if (result.errors.length) {
      reply += `\n\u26A0\uFE0F Errors: ${result.errors.join(', ')}`;
    }

    await channel.send(reply);

  } catch (err) {
    console.error('[KYRAXX] Route error:', err.message);
    try {
      await channel.send('\u274C Something went wrong. Please try again.');
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

  // If we're waiting for a label reply, don't process as new content
  if (awaitingLabel.has(message.author.id)) return;

  console.log(`[KYRAXX] DM from ${message.author.tag}: ${message.content?.slice(0, 80)}`);

  // Command handling
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

  // ── Set presence: Do Not Disturb + custom status with animated crown emoji ──
  client.user.setStatus('dnd');
  client.user.setActivity({
    name: 'Custom Status',
    type: ActivityType.Custom,
    state: 'Personal Saver for my King !',
    emoji: { id: '1491768099450388673', name: 'k_anim_crown', animated: true },
  });

  console.log('');
  console.log('  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('  \u2502  Kyraxx Organiser            \u2502');
  console.log('  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  console.log(`  \u2502  Bot:    ${client.user.tag.padEnd(24)}\u2502`);
  console.log(`  \u2502  Owner:  ${OWNER_ID.padEnd(24)}\u2502`);
  console.log(`  \u2502  Memory: ${(mem + 'MB').padEnd(24)}\u2502`);
  console.log('  \u2502  Status: Do Not Disturb       \u2502');
  console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
  console.log('');
});

// ── Event: messageCreate ────────────────────────────────────────────────────

client.on('messageCreate', async (message) => {
  if (message.channel?.partial) {
    try { await message.channel.fetch(); } catch { return; }
  }
  if (message.channel.type === ChannelType.DM) {
    handledMessages.add(message.id);
    return handleDM(message);
  }
});

// ── Fallback: Raw event handler for DMs ─────────────────────────────────────

const handledMessages = new Set();

client.on('raw', async (event) => {
  if (event.t !== 'MESSAGE_CREATE') return;
  if (event.d.channel_type !== 1) return;

  const msgId = event.d.id;

  setTimeout(async () => {
    if (handledMessages.has(msgId)) {
      handledMessages.delete(msgId);
      return;
    }

    console.log(`[KYRAXX] Raw DM fallback for ${msgId}`);

    try {
      const channel = await client.channels.fetch(event.d.channel_id);
      if (!channel) return;
      const message = await channel.messages.fetch(msgId);
      if (!message) return;
      handledMessages.add(msgId);
      await handleDM(message);
    } catch (err) {
      console.error('[KYRAXX] Raw handler error:', err.message);
    }
  }, 500);
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

setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[KYRAXX] Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
}, 600000);

setInterval(() => { handledMessages.clear(); }, 60000);

client.login(process.env.DISCORD_TOKEN);
