require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Options, ChannelType, ActivityType, EmbedBuilder } = require('discord.js');
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

const OWNER_IDS = [
  process.env.OWNER_ID,            // Bot account
  '1477265298796052573',           // Main account
];
const LABEL_TIMEOUT = 30000;

// ── Client setup ────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 10,
    GuildMemberManager: 10,
    ReactionManager: 0,
    PresenceManager: 0,
    VoiceStateManager: 0,
    ThreadManager: 0,
    GuildEmojiManager: 100,
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

// pendingLabel: userId -> { resolve, timer }
// When set, the next DM from that user is treated as a label reply.
const pendingLabel = new Map();

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

function askAndOrganize(channel, parsed, user) {
  const askEmbed = formatAskLabel(parsed);
  channel.send({ embeds: [askEmbed] });

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingLabel.delete(user.id);
      resolve(null); // Timeout - no label
    }, LABEL_TIMEOUT);

    pendingLabel.set(user.id, { resolve, timer });
  });
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
      await messages[0].reply(`${e('k_search')} I couldn't find anything to organise. Send me links, text, code, or files!`);
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
      try { await msg.react('1491764852258246687'); } catch { /* ignore */ }
    }

    // Confirmation
    const parts = [];
    if (parsed.urls.length) parts.push(`${e('k_link')} ${parsed.urls.length} link(s)`);
    if (parsed.contentTypes.includes('text')) parts.push(`${e('k_note')} text`);
    if (parsed.codeBlocks.length) parts.push(`${e('k_code')} ${parsed.codeBlocks.length} code`);
    if (parsed.attachments.length) parts.push(`${e('k_media')} ${parsed.attachments.length} file(s)`);
    if (parsed.isPrompt) parts.push(`${e('k_prompt')} prompt`);
    if (parsed.forwarded) parts.push(`${e('k_forward')} forwarded`);

    let reply = `${e('k_anim_party')} **Organised!**  ${parts.join('  \u2022  ')}`;
    if (label) reply += `\n${e('k_pin')} Label: **"${label}"**`;
    if (result.filedTo) {
      reply += `\n${e('k_inbox')} Filed to: <#${result.filedTo}>  (${result.label})`;
    }
    if (result.errors.length) {
      reply += `\n${e('k_shield')} Errors: ${result.errors.join(', ')}`;
    }

    await channel.send(reply);

  } catch (err) {
    console.error('[KYRAXX] Route error:', err.message);
    try {
      await channel.send(`${e('k_shield')} Something went wrong. Please try again.`);
    } catch { /* ignore */ }
  }
}

// ── DM handler ──────────────────────────────────────────────────────────────

async function handleDM(message) {
  if (message.author.bot) return;

  // Owner-only
  if (!OWNER_IDS.includes(message.author.id)) {
    try {
      await message.reply(`${e('k_shield')} This bot is private.`);
    } catch { /* ignore */ }
    return;
  }

  // If we're waiting for a label reply, resolve it instead of processing as content
  if (pendingLabel.has(message.author.id)) {
    const pending = pendingLabel.get(message.author.id);
    pendingLabel.delete(message.author.id);
    clearTimeout(pending.timer);
    const label = message.content.toLowerCase() === 'skip' ? null : message.content.trim();
    pending.resolve(label);
    return;
  }

  console.log(`[KYRAXX] DM from ${message.author.tag}: ${message.content?.slice(0, 80)}`);

  // Command handling
  if (message.content.startsWith('!')) {
    try {
      await handleCommand(message);
    } catch (err) {
      console.error('[KYRAXX] Command error:', err.message);
      try { await message.reply(`${e('k_shield')} Command failed. Try \`!help\`.`); } catch { /* ignore */ }
    }
    return;
  }

  bufferMessage(message);
}

// ── Event: ready ────────────────────────────────────────────────────────────

client.once('ready', () => {
  const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  // ── Set presence: DND + custom status ──
  // Note: Discord does NOT render custom emojis for bot statuses (platform limitation).
  // Using Custom Status (type 4) for the text + DND status.
  client.user.setPresence({
    status: 'dnd',
    activities: [{
      type: ActivityType.Custom,
      name: 'customstatus',
      state: '\uD83D\uDC8E Personal Saver for my King !',
    }],
  });

  console.log('');
  console.log('  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('  \u2502  Kyraxx Organiser            \u2502');
  console.log('  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  console.log(`  \u2502  Bot:    ${client.user.tag.padEnd(24)}\u2502`);
  console.log(`  \u2502  Owners: ${OWNER_IDS.length} authorized          \u2502`);
  console.log(`  \u2502  Memory: ${(mem + 'MB').padEnd(24)}\u2502`);
  console.log('  \u2502  Status: Do Not Disturb       \u2502');
  console.log('  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
  console.log('');
});

// ── Event: guildMemberAdd (server protection) ──────────────────────────────

client.on('guildMemberAdd', async (member) => {
  // Allow owners and bots
  if (OWNER_IDS.includes(member.id)) return;
  if (member.user.bot) return;

  console.log(`[KYRAXX] Unauthorized join: ${member.user.tag} (${member.id})`);

  // Send DM before kicking
  try {
    const kickEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${e('k_shield')}  Access Denied`)
      .setDescription(
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n` +
        `${e('k_anim_bolt')}  **This Server is Protected and Only**\n` +
        `**Authorised Users Can Join !**\n\n` +
        `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n` +
        `${e('k_anim_crown')}  This is a **private server** managed\n` +
        `by **Kyraxx Organiser**.\n\n` +
        `${e('k_anim_heart')}  If you believe this is a mistake,\n` +
        `contact the server owner.\n\n` +
        `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`
      )
      .setFooter({ text: 'Kyraxx Organiser  \u2022  Server Protection' })
      .setTimestamp();

    await member.send({ embeds: [kickEmbed] });
  } catch {
    // Can't DM user (DMs disabled), kick anyway
  }

  // Kick the member
  try {
    await member.kick('Unauthorized: not in owner list');
    console.log(`[KYRAXX] Kicked ${member.user.tag}`);
  } catch (err) {
    console.error(`[KYRAXX] Failed to kick ${member.user.tag}:`, err.message);
  }
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
