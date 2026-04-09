const { EmbedBuilder } = require('discord.js');

// ── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
  prompts:   0x9B59B6,
  media:     0xEB459E,
  links:     0x5865F2,
  forwarded: 0x99AAB5,
  code:      0x2B2D31,
  mix:       0xE67E22,
  search:    0x5865F2,
  stats:     0x57F287,
  success:   0x57F287,
  empty:     0x2B2D31,
  ask:       0x5865F2,
};

// ── Icons ───────────────────────────────────────────────────────────────────

const URL_ICONS = {
  video:   '\uD83C\uDFAC', code:    '\uD83D\uDCBB', social:  '\uD83D\uDCAC',
  article: '\uD83D\uDCF0', docs:    '\uD83D\uDCC4', image:   '\uD83D\uDDBC\uFE0F',
  ai:      '\uD83E\uDD16', store:   '\uD83D\uDED2', music:   '\uD83C\uDFB5',
  web:     '\uD83C\uDF10',
};

const FILE_ICONS = {
  image: '\uD83D\uDDBC\uFE0F', video: '\uD83C\uDFAC', audio: '\uD83C\uDFB5',
  document: '\uD83D\uDCC4', code: '\uD83D\uDCBB', archive: '\uD83D\uDCE6', file: '\uD83D\uDCCE',
};

const ROUTE_EMOJI = {
  prompts: '\uD83E\uDD16', media: '\uD83D\uDCCE', links: '\uD83D\uDD17',
  forwarded: '\uD83D\uDD04', code: '\uD83D\uDCBB', mix: '\uD83D\uDCE6',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

function formatBytes(bytes) {
  if (!bytes) return '? KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function footer(type) {
  return { text: `Kyraxx Organiser  \u2022  ${capitalize(type)}` };
}

function thin() { return '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501'; }
function light() { return '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'; }

function labelBlock(label) {
  if (!label) return '';
  return `\uD83D\uDCCC  **"${truncate(label, 100)}"**\n\n`;
}

function authorLine(user) {
  return { name: `${user.displayName || user.username}`, iconURL: user.displayAvatarURL({ size: 64 }) };
}

// ── ASK embed (prompt for label) ────────────────────────────────────────────

function formatAskLabel(parsed) {
  const preview = [];
  if (parsed.urls.length) preview.push(`\uD83D\uDD17 ${parsed.urls.length} link(s)`);
  if (parsed.contentTypes.includes('text')) preview.push('\uD83D\uDCDD text');
  if (parsed.codeBlocks.length) preview.push(`\uD83D\uDCBB ${parsed.codeBlocks.length} code`);
  if (parsed.attachments.length) preview.push(`\uD83D\uDCCE ${parsed.attachments.length} file(s)`);
  if (parsed.forwarded) preview.push('\uD83D\uDD04 forwarded');

  const emoji = ROUTE_EMOJI[parsed.route] || '\uD83D\uDCE6';
  const dest = capitalize(parsed.route);

  return new EmbedBuilder()
    .setColor(COLORS.ask)
    .setTitle('\uD83D\uDCCC  What\'s this about?')
    .setDescription(
      `${thin()}\n\n` +
      `**Detected:** ${preview.join('  \u2022  ')}\n` +
      `**Destination:** ${emoji} ${dest}\n\n` +
      `${light()}\n\n` +
      `Reply with a **short label** for this content.\n` +
      `Or send \`skip\` to auto-organize without a label.\n\n` +
      `*\u23F3 Auto-skipping in 30 seconds\u2026*`
    );
}

// ── LINKS embed ─────────────────────────────────────────────────────────────

function formatLinks(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.links)
    .setAuthor(authorLine(user))
    .setTitle('\uD83D\uDD17  Links Saved')
    .setFooter(footer('links'))
    .setTimestamp();

  const grouped = {};
  for (const url of parsed.urls) {
    if (!grouped[url.category]) grouped[url.category] = [];
    grouped[url.category].push(url);
  }

  let desc = `${thin()}\n\n`;
  desc += labelBlock(label);

  for (const [category, urls] of Object.entries(grouped)) {
    const icon = URL_ICONS[category] || '\uD83C\uDF10';
    desc += `${icon}  **${capitalize(category)}**\n`;
    desc += urls.slice(0, 10).map((u, i) =>
      `\u2003\`${String(i + 1).padStart(2, '0')}\`  [\`${u.platform}\`](${u.raw})`
    ).join('\n');
    desc += '\n\n';
  }

  desc += thin();
  embed.setDescription(truncate(desc, 4096));

  if (parsed.text && parsed.text.length >= 10) {
    embed.addFields({ name: '\uD83D\uDCDD  Note', value: `> ${truncate(parsed.text, 900)}` });
  }

  return embed;
}

// ── MEDIA embed ─────────────────────────────────────────────────────────────

function formatMedia(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.media)
    .setAuthor(authorLine(user))
    .setTitle(`\uD83D\uDCCE  Media Saved  \u2022  ${parsed.attachments.length} file(s)`)
    .setFooter(footer('media'))
    .setTimestamp();

  const firstImage = parsed.attachments.find(a => a.type === 'image');
  if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);

  let desc = `${thin()}\n\n`;
  desc += labelBlock(label);

  for (const a of parsed.attachments) {
    const icon = FILE_ICONS[a.type] || '\uD83D\uDCCE';
    desc += `${icon}  **${a.name}**\n`;
    desc += `\u2003\u2003\`${a.type.toUpperCase()}\`  \u2502  \`${formatBytes(a.size)}\`\n\n`;
  }

  desc += thin();
  embed.setDescription(truncate(desc, 4096));

  if (parsed.text && parsed.text.length >= 10) {
    embed.addFields({ name: '\uD83D\uDCDD  Caption', value: `> ${truncate(parsed.text, 900)}` });
  }

  return embed;
}

// ── CODE embed ──────────────────────────────────────────────────────────────

function formatCode(codeBlock, user, label) {
  const lang = codeBlock.language || 'txt';
  const lines = codeBlock.content.split('\n').length;
  const chars = codeBlock.content.length;
  const content = truncate(codeBlock.content, 3800);

  let desc = `${thin()}\n\n`;
  desc += labelBlock(label);
  desc += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
  desc += thin();

  return new EmbedBuilder()
    .setColor(COLORS.code)
    .setAuthor(authorLine(user))
    .setTitle(`\uD83D\uDCBB  Code Snippet  \u2022  ${lang.toUpperCase()}`)
    .setDescription(truncate(desc, 4096))
    .addFields({
      name: '\uD83D\uDCCA  Stats',
      value: `\`${lines} lines\`  \u2502  \`${chars} chars\`  \u2502  \`${lang}\``,
    })
    .setFooter(footer('code'))
    .setTimestamp();
}

// ── PROMPTS embed ───────────────────────────────────────────────────────────

function formatPrompt(parsed, user, label) {
  const wordCount = parsed.raw.split(/\s+/).filter(Boolean).length;
  const charCount = parsed.raw.length;

  let desc = `${thin()}\n\n`;
  desc += labelBlock(label);
  desc += truncate(parsed.raw, 3600);
  desc += `\n\n${thin()}`;

  const embed = new EmbedBuilder()
    .setColor(COLORS.prompts)
    .setAuthor(authorLine(user))
    .setTitle('\uD83E\uDD16  AI Prompt Saved')
    .setDescription(truncate(desc, 4096))
    .addFields({
      name: '\uD83D\uDCCA  Stats',
      value: `\`${wordCount} words\`  \u2502  \`${charCount} chars\``,
      inline: true,
    })
    .setFooter(footer('prompt'))
    .setTimestamp();

  if (parsed.urls.length > 0) {
    const linkList = parsed.urls.slice(0, 5)
      .map(u => `[\`${u.platform}\`](${u.raw})`)
      .join('  \u2022  ');
    embed.addFields({ name: '\uD83D\uDD17  References', value: linkList, inline: true });
  }

  return embed;
}

// ── FORWARDED embed ─────────────────────────────────────────────────────────

function formatForwarded(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.forwarded)
    .setAuthor(authorLine(user))
    .setTitle('\uD83D\uDD04  Forwarded Message')
    .setFooter(footer('forwarded'))
    .setTimestamp();

  const from = parsed.forwardedData?.author || 'Unknown';
  const content = parsed.forwardedData?.content || parsed.raw;

  let desc = `${thin()}\n\n`;
  desc += labelBlock(label);
  desc += `\uD83D\uDCAC  **From:** \`${from}\`\n\n`;
  desc += content.split('\n').map(l => `> ${l}`).join('\n');
  desc += `\n\n${thin()}`;

  embed.setDescription(truncate(desc, 4096));

  if (parsed.urls.length > 0) {
    const linkList = parsed.urls.slice(0, 5)
      .map(u => `${URL_ICONS[u.category] || '\uD83C\uDF10'} [\`${u.platform}\`](${u.raw})`)
      .join('\n');
    embed.addFields({ name: '\uD83D\uDD17  Links', value: linkList, inline: true });
  }

  if (parsed.attachments.length > 0) {
    const firstImage = parsed.attachments.find(a => a.type === 'image');
    if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);
    const fileInfo = parsed.attachments
      .map(a => `${FILE_ICONS[a.type] || '\uD83D\uDCCE'} **${a.name}** \`${formatBytes(a.size)}\``)
      .join('\n');
    embed.addFields({ name: '\uD83D\uDCCE  Attachments', value: fileInfo, inline: true });
  }

  return embed;
}

// ── MIX embed ───────────────────────────────────────────────────────────────

function formatMix(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.mix)
    .setAuthor(authorLine(user))
    .setTitle('\uD83D\uDCE6  Mixed Content')
    .setFooter(footer('mix'))
    .setTimestamp();

  let desc = `${thin()}\n\n`;
  desc += labelBlock(label);

  if (parsed.text && parsed.text.length >= 5) {
    desc += `\uD83D\uDCDD  **Text**\n`;
    desc += truncate(parsed.text, 600).split('\n').map(l => `> ${l}`).join('\n');
    desc += '\n\n';
  }

  if (parsed.urls.length > 0) {
    desc += `${light()}\n\n`;
    desc += `\uD83D\uDD17  **Links**\n`;
    desc += parsed.urls.slice(0, 6).map(u =>
      `\u2003${URL_ICONS[u.category] || '\uD83C\uDF10'} [\`${u.platform}\`](${u.raw})`
    ).join('\n');
    desc += '\n\n';
  }

  if (parsed.codeBlocks.length > 0) {
    desc += `${light()}\n\n`;
    const block = parsed.codeBlocks[0];
    desc += `\uD83D\uDCBB  **Code** \`${block.language}\`\n`;
    desc += `\`\`\`${block.language}\n${truncate(block.content, 400)}\n\`\`\`\n\n`;
  }

  if (parsed.attachments.length > 0) {
    const firstImage = parsed.attachments.find(a => a.type === 'image');
    if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);
    desc += `${light()}\n\n`;
    desc += `\uD83D\uDCCE  **Files**\n`;
    desc += parsed.attachments.map(a =>
      `\u2003${FILE_ICONS[a.type] || '\uD83D\uDCCE'} **${a.name}** \`${formatBytes(a.size)}\``
    ).join('\n');
    desc += '\n\n';
  }

  desc += thin();
  embed.setDescription(truncate(desc, 4096));

  const types = parsed.contentTypes.map(t => `\`${t}\``).join(' + ');
  embed.addFields({ name: '\uD83D\uDCE6  Contains', value: types, inline: true });

  return embed;
}

// ── Search / Recent / Stats ─────────────────────────────────────────────────

function formatSearchResults(results, query) {
  if (!results.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription(`\uD83D\uDD0D  No results for **"${query}"**`);
  }

  const lines = results.map((r, i) => {
    const preview = truncate(r.content_raw, 60);
    const date = (r.created_at.split('T')[0] || r.created_at.split(' ')[0]);
    return `\`${String(i + 1).padStart(2, '0')}\`  \`#${r.id}\`  \u2502  \`${r.content_type}\`  \u2502  \`${date}\`\n\u2003\u2003> ${preview}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.search)
    .setTitle(`\uD83D\uDD0D  Search: "${truncate(query, 30)}"`)
    .setDescription(`${thin()}\n\n${truncate(lines.join('\n\n'), 4000)}\n\n${thin()}`)
    .setFooter({ text: `${results.length} result(s)  \u2022  Kyraxx Organiser` });
}

function formatRecentResults(results) {
  if (!results.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription('\uD83D\uDCCB  No entries yet. Send me something to organise!');
  }

  const lines = results.map((r, i) => {
    const preview = truncate(r.content_raw, 60);
    const date = (r.created_at.split('T')[0] || r.created_at.split(' ')[0]);
    return `\`${String(i + 1).padStart(2, '0')}\`  \`#${r.id}\`  \u2502  \`${r.content_type}\`  \u2502  \`${date}\`\n\u2003\u2003> ${preview}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('\uD83D\uDCCB  Recent Entries')
    .setDescription(`${thin()}\n\n${truncate(lines.join('\n\n'), 4000)}\n\n${thin()}`)
    .setFooter({ text: `${results.length} entries  \u2022  Kyraxx Organiser` });
}

function formatStats(stats) {
  if (!stats.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription('\uD83D\uDCCA  No entries yet.');
  }

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const bar = (count) => {
    const pct = Math.round((count / total) * 15);
    return '\u2588'.repeat(pct) + '\u2591'.repeat(15 - pct);
  };

  const lines = stats.map(s => {
    const emoji = ROUTE_EMOJI[s.content_type] || '\uD83D\uDCE6';
    return `${emoji} **${capitalize(s.content_type)}**\n\`${bar(s.count)}\`  **${s.count}**`;
  });
  lines.push(`\n\uD83D\uDCCA **Total: ${total}**`);

  return new EmbedBuilder()
    .setColor(COLORS.stats)
    .setTitle('\uD83D\uDCCA  Kyraxx Stats')
    .setDescription(`${thin()}\n\n${lines.join('\n\n')}\n\n${thin()}`)
    .setFooter(footer('stats'));
}

module.exports = {
  formatLinks, formatMedia, formatCode, formatPrompt,
  formatForwarded, formatMix, formatAskLabel,
  formatSearchResults, formatRecentResults, formatStats,
};
