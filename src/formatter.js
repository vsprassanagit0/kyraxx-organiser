const { EmbedBuilder } = require('discord.js');

// ── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
  prompts:   0x9B59B6,  // Purple  - AI prompts
  media:     0xEB459E,  // Fuchsia - media/files
  links:     0x5865F2,  // Blurple - links
  forwarded: 0x99AAB5,  // Grey    - forwarded
  code:      0x2B2D31,  // Dark    - code
  mix:       0xE67E22,  // Orange  - mixed content
  search:    0x5865F2,
  stats:     0x57F287,
  success:   0x57F287,
  empty:     0x2B2D31,
};

// ── Category icons ──────────────────────────────────────────────────────────

const URL_ICONS = {
  video:   '\uD83C\uDFAC',   // film clapper
  code:    '\uD83D\uDCBB',   // laptop
  social:  '\uD83D\uDCAC',   // speech bubble
  article: '\uD83D\uDCF0',   // newspaper
  docs:    '\uD83D\uDCC4',   // page facing up
  image:   '\uD83D\uDDBC\uFE0F', // framed picture
  ai:      '\uD83E\uDD16',   // robot
  store:   '\uD83D\uDED2',   // shopping cart
  music:   '\uD83C\uDFB5',   // music note
  web:     '\uD83C\uDF10',   // globe
};

const FILE_ICONS = {
  image:    '\uD83D\uDDBC\uFE0F',
  video:    '\uD83C\uDFAC',
  audio:    '\uD83C\uDFB5',
  document: '\uD83D\uDCC4',
  code:     '\uD83D\uDCBB',
  archive:  '\uD83D\uDCE6',
  file:     '\uD83D\uDCCE',
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

function makeFooter(type) {
  return { text: `Kyraxx Organiser  \u2502  ${capitalize(type)}` };
}

function divider() {
  return '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
}

// ── LINKS embed ─────────────────────────────────────────────────────────────

function formatLinks(parsed, user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.links)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 32 }) })
    .setFooter(makeFooter('links'))
    .setTimestamp();

  // Group URLs by category
  const grouped = {};
  for (const url of parsed.urls) {
    if (!grouped[url.category]) grouped[url.category] = [];
    grouped[url.category].push(url);
  }

  const sections = [];
  for (const [category, urls] of Object.entries(grouped)) {
    const icon = URL_ICONS[category] || '\uD83C\uDF10';
    const header = `${icon}  **${capitalize(category)}**`;
    const list = urls
      .slice(0, 10)
      .map((u, i) => `\`${String(i + 1).padStart(2, '0')}\` [\`${u.platform}\`](${u.raw})`)
      .join('\n');
    sections.push(`${header}\n${list}`);
  }

  embed.setDescription(sections.join(`\n\n`));

  // Add text context if present
  if (parsed.text && parsed.text.length >= 10) {
    embed.addFields({
      name: '\uD83D\uDCDD  Context',
      value: `>>> ${truncate(parsed.text, 900)}`,
    });
  }

  return embed;
}

// ── MEDIA embed ─────────────────────────────────────────────────────────────

function formatMedia(parsed, user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.media)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 32 }) })
    .setFooter(makeFooter('media'))
    .setTimestamp();

  // Image preview
  const firstImage = parsed.attachments.find(a => a.type === 'image');
  if (firstImage) {
    embed.setImage(firstImage.proxyURL || firstImage.url);
  }

  // File listing
  const fileList = parsed.attachments.map((a, i) => {
    const icon = FILE_ICONS[a.type] || '\uD83D\uDCCE';
    return `${icon}  **${a.name}**\n\u2003\u2003\u2003\`${a.type.toUpperCase()}\`  \u2502  \`${formatBytes(a.size)}\``;
  });

  embed.setDescription(fileList.join('\n\n'));

  // Text context
  if (parsed.text && parsed.text.length >= 10) {
    embed.addFields({
      name: '\uD83D\uDCDD  Caption',
      value: `>>> ${truncate(parsed.text, 900)}`,
    });
  }

  return embed;
}

// ── CODE embed ──────────────────────────────────────────────────────────────

function formatCode(codeBlock, user) {
  const lang = codeBlock.language || 'txt';
  const lines = codeBlock.content.split('\n').length;
  const chars = codeBlock.content.length;
  const content = truncate(codeBlock.content, 3900);

  return new EmbedBuilder()
    .setColor(COLORS.code)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 32 }) })
    .setDescription(`\`\`\`${lang}\n${content}\n\`\`\``)
    .addFields({
      name: '\uD83D\uDCCA  Info',
      value: `\`${lang.toUpperCase()}\`  \u2502  \`${lines} lines\`  \u2502  \`${chars} chars\``,
    })
    .setFooter(makeFooter('code'))
    .setTimestamp();
}

// ── PROMPTS embed ───────────────────────────────────────────────────────────

function formatPrompt(parsed, user) {
  const wordCount = parsed.raw.split(/\s+/).filter(Boolean).length;
  const charCount = parsed.raw.length;

  const embed = new EmbedBuilder()
    .setColor(COLORS.prompts)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 32 }) })
    .setDescription(truncate(parsed.raw, 4096))
    .addFields({
      name: '\uD83D\uDCCA  Info',
      value: `\`${wordCount} words\`  \u2502  \`${charCount} chars\``,
      inline: true,
    })
    .setFooter(makeFooter('prompt'))
    .setTimestamp();

  // If there are reference links in the prompt
  if (parsed.urls.length > 0) {
    const linkList = parsed.urls
      .slice(0, 5)
      .map(u => `[\`${u.platform}\`](${u.raw})`)
      .join('  \u2022  ');
    embed.addFields({
      name: '\uD83D\uDD17  Reference Links',
      value: linkList,
      inline: true,
    });
  }

  return embed;
}

// ── FORWARDED embed ─────────────────────────────────────────────────────────

function formatForwarded(parsed, user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.forwarded)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 32 }) })
    .setFooter(makeFooter('forwarded'))
    .setTimestamp();

  // Show original author if available
  if (parsed.forwardedData?.author) {
    embed.addFields({
      name: '\uD83D\uDD04  Forwarded from',
      value: `\`${parsed.forwardedData.author}\``,
      inline: true,
    });
  }

  // Content
  const content = parsed.forwardedData?.content || parsed.raw;
  embed.setDescription(`>>> ${truncate(content, 4000)}`);

  // Show links if present
  if (parsed.urls.length > 0) {
    const linkList = parsed.urls
      .slice(0, 5)
      .map(u => `${URL_ICONS[u.category] || '\uD83C\uDF10'} [\`${u.platform}\`](${u.raw})`)
      .join('\n');
    embed.addFields({ name: '\uD83D\uDD17  Links', value: linkList });
  }

  // Show attachments if present
  if (parsed.attachments.length > 0) {
    const firstImage = parsed.attachments.find(a => a.type === 'image');
    if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);

    const fileInfo = parsed.attachments
      .map(a => `${FILE_ICONS[a.type] || '\uD83D\uDCCE'} **${a.name}** \`${formatBytes(a.size)}\``)
      .join('\n');
    embed.addFields({ name: '\uD83D\uDCCE  Attachments', value: fileInfo });
  }

  return embed;
}

// ── MIX embed (multi-type content) ──────────────────────────────────────────

function formatMix(parsed, user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.mix)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 32 }) })
    .setFooter(makeFooter('mix'))
    .setTimestamp();

  const sections = [];

  // Text section (use per-line > quotes to avoid bleeding into other sections)
  if (parsed.text && parsed.text.length >= 5) {
    const quoted = truncate(parsed.text, 800)
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
    sections.push(`\uD83D\uDCDD  **Text**\n${quoted}`);
  }

  // Links section
  if (parsed.urls.length > 0) {
    const linkList = parsed.urls
      .slice(0, 8)
      .map(u => `${URL_ICONS[u.category] || '\uD83C\uDF10'} [\`${u.platform}\`](${u.raw})`)
      .join('\n');
    sections.push(`\uD83D\uDD17  **Links**\n${linkList}`);
  }

  // Code section
  if (parsed.codeBlocks.length > 0) {
    const block = parsed.codeBlocks[0];
    const preview = truncate(block.content, 500);
    sections.push(`\uD83D\uDCBB  **Code** (\`${block.language}\`)\n\`\`\`${block.language}\n${preview}\n\`\`\``);
  }

  // Files section
  if (parsed.attachments.length > 0) {
    const firstImage = parsed.attachments.find(a => a.type === 'image');
    if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);

    const fileList = parsed.attachments
      .map(a => `${FILE_ICONS[a.type] || '\uD83D\uDCCE'} **${a.name}** \`${formatBytes(a.size)}\``)
      .join('\n');
    sections.push(`\uD83D\uDCCE  **Files**\n${fileList}`);
  }

  embed.setDescription(truncate(sections.join(`\n\n${divider()}\n\n`), 4096));

  // Content type summary
  const types = parsed.contentTypes.map(t => `\`${t}\``).join(' + ');
  embed.addFields({ name: '\uD83D\uDCE6  Contains', value: types, inline: true });

  return embed;
}

// ── Search / Recent / Stats embeds ──────────────────────────────────────────

function formatSearchResults(results, query) {
  if (!results.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription(`\uD83D\uDD0D  No results for **"${query}"**`);
  }

  const lines = results.map((r, i) => {
    const preview = truncate(r.content_raw, 70);
    const date = (r.created_at.split('T')[0] || r.created_at.split(' ')[0]);
    return `\`${String(i + 1).padStart(2, '0')}\`  \`#${r.id}\`  \u2502  \`${r.content_type}\`  \u2502  \`${date}\`\n\u2003\u2003\u2003${preview}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.search)
    .setTitle(`\uD83D\uDD0D  Search: "${truncate(query, 40)}"`)
    .setDescription(truncate(lines.join('\n\n'), 4096))
    .setFooter({ text: `${results.length} result(s)  \u2502  Kyraxx Organiser` });
}

function formatRecentResults(results) {
  if (!results.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription('\uD83D\uDCCB  No entries yet. Send me something to organise!');
  }

  const lines = results.map((r, i) => {
    const preview = truncate(r.content_raw, 70);
    const date = (r.created_at.split('T')[0] || r.created_at.split(' ')[0]);
    return `\`${String(i + 1).padStart(2, '0')}\`  \`#${r.id}\`  \u2502  \`${r.content_type}\`  \u2502  \`${date}\`\n\u2003\u2003\u2003${preview}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('\uD83D\uDCCB  Recent Entries')
    .setDescription(truncate(lines.join('\n\n'), 4096))
    .setFooter({ text: `${results.length} entry/entries  \u2502  Kyraxx Organiser` });
}

function formatStats(stats) {
  if (!stats.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription('\uD83D\uDCCA  No entries yet.');
  }

  const total = stats.reduce((sum, s) => sum + s.count, 0);

  const bar = (count) => {
    const pct = Math.round((count / total) * 20);
    return '\u2588'.repeat(pct) + '\u2591'.repeat(20 - pct);
  };

  const lines = stats.map(s =>
    `**${capitalize(s.content_type)}**\n\`${bar(s.count)}\`  **${s.count}**`
  );
  lines.push(`\n**Total: ${total}**`);

  return new EmbedBuilder()
    .setColor(COLORS.stats)
    .setTitle('\uD83D\uDCCA  Kyraxx Stats')
    .setDescription(lines.join('\n\n'))
    .setFooter(makeFooter('stats'));
}

module.exports = {
  formatLinks,
  formatMedia,
  formatCode,
  formatPrompt,
  formatForwarded,
  formatMix,
  formatSearchResults,
  formatRecentResults,
  formatStats,
};
