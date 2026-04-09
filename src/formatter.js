const { EmbedBuilder } = require('discord.js');
const { e, urlIcon, fileIcon, routeIcon } = require('./emojis');

// ── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
  prompts:   0x9B59B6,
  media:     0xEB459E,
  links:     0x5865F2,
  forwarded: 0x99AAB5,
  code:      0x1E1F22,
  mix:       0xE67E22,
  search:    0x5865F2,
  stats:     0x57F287,
  success:   0x57F287,
  empty:     0x2B2D31,
  ask:       0x5865F2,
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

function foot(type) {
  return { text: `Kyraxx Organiser  \u2022  ${capitalize(type)}` };
}

function sep() { return '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501'; }
function div() { return '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'; }

function labelBlock(label) {
  if (!label) return '';
  return `${e('k_pin')}  **"${truncate(label, 100)}"**\n\n`;
}

function author(user) {
  return { name: user.displayName || user.username, iconURL: user.displayAvatarURL({ size: 64 }) };
}

// ── ASK embed ───────────────────────────────────────────────────────────────

function formatAskLabel(parsed) {
  const preview = [];
  if (parsed.urls.length) preview.push(`${e('k_link')} ${parsed.urls.length} link(s)`);
  if (parsed.contentTypes.includes('text')) preview.push(`${e('k_note')} text`);
  if (parsed.codeBlocks.length) preview.push(`${e('k_code')} ${parsed.codeBlocks.length} code`);
  if (parsed.attachments.length) preview.push(`${e('k_media')} ${parsed.attachments.length} file(s)`);
  if (parsed.forwarded) preview.push(`${e('k_forward')} forwarded`);

  const icon = routeIcon(parsed.route);
  const dest = capitalize(parsed.route);

  return new EmbedBuilder()
    .setColor(COLORS.ask)
    .setTitle(`${e('k_pin')}  What's this about?`)
    .setDescription(
      `${sep()}\n\n` +
      `**Detected:** ${preview.join('  \u2022  ')}\n` +
      `**Destination:** ${icon} **${dest}**\n\n` +
      `${div()}\n\n` +
      `Reply with a **short label** for this content.\n` +
      `Send \`skip\` to organize without a label.\n\n` +
      `*${e('k_loading')} Auto-skipping in 30 seconds\u2026*`
    );
}

// ── LINKS embed ─────────────────────────────────────────────────────────────

function formatLinks(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.links)
    .setAuthor(author(user))
    .setTitle(`${e('k_link')}  Links Saved`)
    .setFooter(foot('links'))
    .setTimestamp();

  const grouped = {};
  for (const url of parsed.urls) {
    if (!grouped[url.category]) grouped[url.category] = [];
    grouped[url.category].push(url);
  }

  let desc = `${sep()}\n\n`;
  desc += labelBlock(label);

  for (const [category, urls] of Object.entries(grouped)) {
    const icon = urlIcon(category);
    desc += `${icon}  **${capitalize(category)}**\n`;
    desc += urls.slice(0, 10).map((u, i) =>
      `\u2003\`${String(i + 1).padStart(2, '0')}\`  [\`${u.platform}\`](${u.raw})`
    ).join('\n');
    desc += '\n\n';
  }

  desc += sep();
  embed.setDescription(truncate(desc, 4096));

  if (parsed.text && parsed.text.length >= 10) {
    embed.addFields({ name: `${e('k_note')}  Note`, value: `> ${truncate(parsed.text, 900)}` });
  }

  return embed;
}

// ── MEDIA embed ─────────────────────────────────────────────────────────────

function formatMedia(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.media)
    .setAuthor(author(user))
    .setTitle(`${e('k_media')}  Media Saved  \u2022  ${parsed.attachments.length} file(s)`)
    .setFooter(foot('media'))
    .setTimestamp();

  const firstImage = parsed.attachments.find(a => a.type === 'image');
  if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);

  let desc = `${sep()}\n\n`;
  desc += labelBlock(label);

  for (const a of parsed.attachments) {
    const icon = fileIcon(a.type);
    desc += `${icon}  **${a.name}**\n`;
    desc += `\u2003\u2003\`${a.type.toUpperCase()}\`  \u2502  \`${formatBytes(a.size)}\`\n\n`;
  }

  desc += sep();
  embed.setDescription(truncate(desc, 4096));

  if (parsed.text && parsed.text.length >= 10) {
    embed.addFields({ name: `${e('k_note')}  Caption`, value: `> ${truncate(parsed.text, 900)}` });
  }

  return embed;
}

// ── CODE embed ──────────────────────────────────────────────────────────────

function formatCode(codeBlock, user, label) {
  const lang = codeBlock.language || 'txt';
  const lines = codeBlock.content.split('\n').length;
  const chars = codeBlock.content.length;
  const content = truncate(codeBlock.content, 3600);

  let desc = `${sep()}\n\n`;
  desc += labelBlock(label);
  desc += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
  desc += sep();

  return new EmbedBuilder()
    .setColor(COLORS.code)
    .setAuthor(author(user))
    .setTitle(`${e('k_code')}  Code Snippet  \u2022  ${lang.toUpperCase()}`)
    .setDescription(truncate(desc, 4096))
    .addFields({
      name: `${e('k_stats')}  Stats`,
      value: `\`${lines} lines\`  \u2502  \`${chars} chars\`  \u2502  \`${lang}\``,
    })
    .setFooter(foot('code'))
    .setTimestamp();
}

// ── PROMPTS embed ───────────────────────────────────────────────────────────

function formatPrompt(parsed, user, label) {
  const wordCount = parsed.raw.split(/\s+/).filter(Boolean).length;
  const charCount = parsed.raw.length;

  let desc = `${sep()}\n\n`;
  desc += labelBlock(label);
  desc += truncate(parsed.raw, 3400);
  desc += `\n\n${sep()}`;

  const embed = new EmbedBuilder()
    .setColor(COLORS.prompts)
    .setAuthor(author(user))
    .setTitle(`${e('k_prompt')}  AI Prompt Saved`)
    .setDescription(truncate(desc, 4096))
    .addFields({
      name: `${e('k_stats')}  Stats`,
      value: `\`${wordCount} words\`  \u2502  \`${charCount} chars\``,
      inline: true,
    })
    .setFooter(foot('prompt'))
    .setTimestamp();

  if (parsed.urls.length > 0) {
    const linkList = parsed.urls.slice(0, 5)
      .map(u => `[\`${u.platform}\`](${u.raw})`)
      .join('  \u2022  ');
    embed.addFields({ name: `${e('k_link')}  References`, value: linkList, inline: true });
  }

  return embed;
}

// ── FORWARDED embed ─────────────────────────────────────────────────────────

function formatForwarded(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.forwarded)
    .setAuthor(author(user))
    .setTitle(`${e('k_forward')}  Forwarded Message`)
    .setFooter(foot('forwarded'))
    .setTimestamp();

  const from = parsed.forwardedData?.author || 'Unknown';
  const content = parsed.forwardedData?.content || parsed.raw;

  let desc = `${sep()}\n\n`;
  desc += labelBlock(label);
  desc += `${e('k_social')}  **From:** \`${from}\`\n\n`;
  desc += content.split('\n').map(l => `> ${l}`).join('\n');
  desc += `\n\n${sep()}`;

  embed.setDescription(truncate(desc, 4096));

  if (parsed.urls.length > 0) {
    const linkList = parsed.urls.slice(0, 5)
      .map(u => `${urlIcon(u.category)} [\`${u.platform}\`](${u.raw})`)
      .join('\n');
    embed.addFields({ name: `${e('k_link')}  Links`, value: linkList, inline: true });
  }

  if (parsed.attachments.length > 0) {
    const firstImage = parsed.attachments.find(a => a.type === 'image');
    if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);
    const fileInfo = parsed.attachments
      .map(a => `${fileIcon(a.type)} **${a.name}** \`${formatBytes(a.size)}\``)
      .join('\n');
    embed.addFields({ name: `${e('k_media')}  Attachments`, value: fileInfo, inline: true });
  }

  return embed;
}

// ── MIX embed ───────────────────────────────────────────────────────────────

function formatMix(parsed, user, label) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.mix)
    .setAuthor(author(user))
    .setTitle(`${e('k_mix')}  Mixed Content`)
    .setFooter(foot('mix'))
    .setTimestamp();

  let desc = `${sep()}\n\n`;
  desc += labelBlock(label);

  if (parsed.text && parsed.text.length >= 5) {
    desc += `${e('k_note')}  **Text**\n`;
    desc += truncate(parsed.text, 600).split('\n').map(l => `> ${l}`).join('\n');
    desc += '\n\n';
  }

  if (parsed.urls.length > 0) {
    desc += `${div()}\n\n`;
    desc += `${e('k_link')}  **Links**\n`;
    desc += parsed.urls.slice(0, 6).map(u =>
      `\u2003${urlIcon(u.category)} [\`${u.platform}\`](${u.raw})`
    ).join('\n');
    desc += '\n\n';
  }

  if (parsed.codeBlocks.length > 0) {
    desc += `${div()}\n\n`;
    const block = parsed.codeBlocks[0];
    desc += `${e('k_code')}  **Code** \`${block.language}\`\n`;
    desc += `\`\`\`${block.language}\n${truncate(block.content, 400)}\n\`\`\`\n\n`;
  }

  if (parsed.attachments.length > 0) {
    const firstImage = parsed.attachments.find(a => a.type === 'image');
    if (firstImage) embed.setImage(firstImage.proxyURL || firstImage.url);
    desc += `${div()}\n\n`;
    desc += `${e('k_media')}  **Files**\n`;
    desc += parsed.attachments.map(a =>
      `\u2003${fileIcon(a.type)} **${a.name}** \`${formatBytes(a.size)}\``
    ).join('\n');
    desc += '\n\n';
  }

  desc += sep();
  embed.setDescription(truncate(desc, 4096));

  const types = parsed.contentTypes.map(t => `\`${t}\``).join(' + ');
  embed.addFields({ name: `${e('k_mix')}  Contains`, value: types, inline: true });

  return embed;
}

// ── Search / Recent / Stats ─────────────────────────────────────────────────

function formatSearchResults(results, query) {
  if (!results.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription(`${e('k_search')}  No results for **"${query}"**`);
  }

  const lines = results.map((r, i) => {
    const preview = truncate(r.content_raw, 60);
    const date = (r.created_at.split('T')[0] || r.created_at.split(' ')[0]);
    return `\`${String(i + 1).padStart(2, '0')}\`  \`#${r.id}\`  \u2502  \`${r.content_type}\`  \u2502  \`${date}\`\n\u2003\u2003> ${preview}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.search)
    .setTitle(`${e('k_search')}  Search: "${truncate(query, 30)}"`)
    .setDescription(`${sep()}\n\n${truncate(lines.join('\n\n'), 4000)}\n\n${sep()}`)
    .setFooter({ text: `${results.length} result(s)  \u2022  Kyraxx Organiser` });
}

function formatRecentResults(results) {
  if (!results.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription(`${e('k_inbox')}  No entries yet. Send me something to organise!`);
  }

  const lines = results.map((r, i) => {
    const preview = truncate(r.content_raw, 60);
    const date = (r.created_at.split('T')[0] || r.created_at.split(' ')[0]);
    return `\`${String(i + 1).padStart(2, '0')}\`  \`#${r.id}\`  \u2502  \`${r.content_type}\`  \u2502  \`${date}\`\n\u2003\u2003> ${preview}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`${e('k_inbox')}  Recent Entries`)
    .setDescription(`${sep()}\n\n${truncate(lines.join('\n\n'), 4000)}\n\n${sep()}`)
    .setFooter({ text: `${results.length} entries  \u2022  Kyraxx Organiser` });
}

function formatStats(stats) {
  if (!stats.length) {
    return new EmbedBuilder()
      .setColor(COLORS.empty)
      .setDescription(`${e('k_stats')}  No entries yet.`);
  }

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const bar = (count) => {
    const pct = Math.round((count / total) * 15);
    return '\u2588'.repeat(pct) + '\u2591'.repeat(15 - pct);
  };

  const lines = stats.map(s => {
    const icon = routeIcon(s.content_type);
    return `${icon} **${capitalize(s.content_type)}**\n\`${bar(s.count)}\`  **${s.count}**`;
  });
  lines.push(`\n${e('k_stats')} **Total: ${total}**`);

  return new EmbedBuilder()
    .setColor(COLORS.stats)
    .setTitle(`${e('k_stats')}  Kyraxx Stats`)
    .setDescription(`${sep()}\n\n${lines.join('\n\n')}\n\n${sep()}`)
    .setFooter(foot('stats'));
}

module.exports = {
  formatLinks, formatMedia, formatCode, formatPrompt,
  formatForwarded, formatMix, formatAskLabel,
  formatSearchResults, formatRecentResults, formatStats,
};
