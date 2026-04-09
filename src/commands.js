const { AttachmentBuilder } = require('discord.js');
const db = require('./db');
const fmt = require('./formatter');
const { e } = require('./emojis');

// ── Command handlers ────────────────────────────────────────────────────────

async function handleHelp(message) {
  const help = [
    `${e('k_anim_crown')} **Kyraxx Organiser Commands**`,
    '',
    `${e('k_bolt')} \`!help\` \u2014 Show this message`,
    `${e('k_search')} \`!search <query>\` \u2014 Search your saved content`,
    `${e('k_clock')} \`!recent [count]\` \u2014 Show recent entries (default 5, max 20)`,
    `${e('k_anim_fire')} \`!delete <id>\` \u2014 Delete an entry by its ID`,
    `${e('k_fire')} \`!clear\` \u2014 Delete ALL entries`,
    `${e('k_stats')} \`!stats\` \u2014 Show your content stats`,
    `${e('k_star')} \`!pin <id>\` \u2014 Pin/unpin an important entry`,
    `${e('k_anim_star')} \`!pinned\` \u2014 Show all pinned entries`,
    `${e('k_gem')} \`!export\` \u2014 Export all entries as a text file`,
    '',
    `${e('k_anim_sparkle')} Or just send me any text, links, code, or files \u2014 I'll organise them for you!`,
  ];
  await message.reply(help.join('\n'));
}

async function handleSearch(message, args) {
  const query = args.join(' ').trim();
  if (!query) {
    return message.reply(`${e('k_search')} Usage: \`!search <query>\``);
  }

  const results = db.search(message.author.id, query);
  const embed = fmt.formatSearchResults(results, query);
  await message.reply({ embeds: [embed] });
}

async function handleRecent(message, args) {
  const count = Math.min(Math.max(parseInt(args[0]) || 5, 1), 20);
  const results = db.getRecent(message.author.id, count);
  const embed = fmt.formatRecentResults(results);
  await message.reply({ embeds: [embed] });
}

async function handleDelete(message, args) {
  const id = parseInt(args[0]);
  if (!id || isNaN(id)) {
    return message.reply(`${e('k_tag')} Usage: \`!delete <id>\` \u2014 use \`!recent\` to find entry IDs.`);
  }

  const entry = db.getById(message.author.id, id);
  if (!entry) {
    return message.reply(`${e('k_shield')} Entry \`#${id}\` not found.`);
  }

  const deleted = db.deleteEntry(message.author.id, id);
  if (deleted) {
    await message.reply(`${e('k_anim_fire')} Entry \`#${id}\` deleted.`);
  } else {
    await message.reply(`${e('k_shield')} Could not delete entry \`#${id}\`.`);
  }
}

async function handleClear(message, args) {
  // Require confirmation: !clear confirm
  if (args[0] !== 'confirm') {
    return message.reply(
      `${e('k_fire')} **This will delete ALL your entries.**\n` +
      `${e('k_shield')} Type \`!clear confirm\` to proceed.`
    );
  }

  const count = db.clearAll(message.author.id);
  await message.reply(`${e('k_anim_fire')} Cleared **${count}** entries.`);
}

async function handleStats(message) {
  const stats = db.getStats(message.author.id);
  const embed = fmt.formatStats(stats);
  await message.reply({ embeds: [embed] });
}

async function handlePin(message, args) {
  const id = parseInt(args[0]);
  if (!id || isNaN(id)) {
    return message.reply(`${e('k_star')} Usage: \`!pin <id>\` \u2014 use \`!recent\` to find entry IDs.`);
  }

  const result = db.pinEntry(message.author.id, id);
  if (result === null) {
    return message.reply(`${e('k_shield')} Entry \`#${id}\` not found.`);
  }

  if (result === 1) {
    await message.reply(`${e('k_anim_star')} Entry \`#${id}\` **pinned!**`);
  } else {
    await message.reply(`${e('k_star')} Entry \`#${id}\` **unpinned.**`);
  }
}

async function handlePinned(message) {
  const results = db.getPinned(message.author.id);
  const embed = fmt.formatPinnedResults(results);
  await message.reply({ embeds: [embed] });
}

async function handleExport(message) {
  const entries = db.exportAll(message.author.id);

  if (!entries.length) {
    return message.reply(`${e('k_gem')} No entries to export.`);
  }

  const lines = entries.map((entry, i) => {
    const date = entry.created_at;
    const type = entry.content_type;
    const pinned = entry.pinned ? ' [PINNED]' : '';
    const separator = '='.repeat(60);
    return [
      separator,
      `#${entry.id} | ${type.toUpperCase()}${pinned} | ${date}`,
      separator,
      entry.content_raw,
      '',
    ].join('\n');
  });

  const header = [
    '╔══════════════════════════════════════════════════════════╗',
    '║           KYRAXX ORGANISER - FULL EXPORT                ║',
    `║           ${new Date().toISOString().split('T')[0]}                              ║`,
    `║           Total entries: ${String(entries.length).padEnd(31)}║`,
    '╚══════════════════════════════════════════════════════════╝',
    '',
  ].join('\n');

  const content = header + lines.join('\n');
  const buffer = Buffer.from(content, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `kyraxx-export-${Date.now()}.txt` });

  await message.reply({
    content: `${e('k_gem')} **Export complete!** ${e('k_anim_sparkle')}\n${e('k_file')} **${entries.length}** entries exported.`,
    files: [attachment],
  });
}

// ── Command router ──────────────────────────────────────────────────────────

const COMMANDS = {
  help:    handleHelp,
  search:  handleSearch,
  recent:  handleRecent,
  delete:  handleDelete,
  clear:   handleClear,
  stats:   handleStats,
  pin:     handlePin,
  pinned:  handlePinned,
  export:  handleExport,
};

async function handleCommand(message) {
  const [cmd, ...args] = message.content.slice(1).split(/\s+/);
  const handler = COMMANDS[cmd.toLowerCase()];

  if (!handler) {
    return message.reply(`${e('k_shield')} Unknown command \`!${cmd}\`. Type \`!help\` for available commands.`);
  }

  await handler(message, args);
}

module.exports = { handleCommand };
