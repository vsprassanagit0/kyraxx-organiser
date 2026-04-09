const db = require('./db');
const fmt = require('./formatter');

// ── Command handlers ────────────────────────────────────────────────────────

async function handleHelp(message) {
  const help = [
    '**Kyraxx Organiser Commands**',
    '',
    '`!help` \u2014 Show this message',
    '`!search <query>` \u2014 Search your saved content',
    '`!recent [count]` \u2014 Show recent entries (default 5, max 20)',
    '`!delete <id>` \u2014 Delete an entry by its ID',
    '`!stats` \u2014 Show your content stats',
    '',
    'Or just send me any text, links, code, or files \u2014 I\'ll organise them for you!',
  ];
  await message.reply(help.join('\n'));
}

async function handleSearch(message, args) {
  const query = args.join(' ').trim();
  if (!query) {
    return message.reply('Usage: `!search <query>`');
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
    return message.reply('Usage: `!delete <id>` \u2014 use `!recent` to find entry IDs.');
  }

  const entry = db.getById(message.author.id, id);
  if (!entry) {
    return message.reply(`Entry \`#${id}\` not found.`);
  }

  const deleted = db.deleteEntry(message.author.id, id);
  if (deleted) {
    await message.reply(`Entry \`#${id}\` deleted.`);
  } else {
    await message.reply(`Could not delete entry \`#${id}\`.`);
  }
}

async function handleStats(message) {
  const stats = db.getStats(message.author.id);
  const embed = fmt.formatStats(stats);
  await message.reply({ embeds: [embed] });
}

// ── Command router ──────────────────────────────────────────────────────────

const COMMANDS = {
  help:   handleHelp,
  search: handleSearch,
  recent: handleRecent,
  delete: handleDelete,
  stats:  handleStats,
};

async function handleCommand(message) {
  const [cmd, ...args] = message.content.slice(1).split(/\s+/);
  const handler = COMMANDS[cmd.toLowerCase()];

  if (!handler) {
    return message.reply(`Unknown command \`!${cmd}\`. Type \`!help\` for available commands.`);
  }

  await handler(message, args);
}

module.exports = { handleCommand };
