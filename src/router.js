const fmt = require('./formatter');
const db = require('./db');

// ── Channel mapping ─────────────────────────────────────────────────────────

function getChannelMap() {
  return {
    prompts:   process.env.CHANNEL_PROMPTS,
    media:     process.env.CHANNEL_MEDIA,
    links:     process.env.CHANNEL_LINKS,
    forwarded: process.env.CHANNEL_FORWARDED,
    code:      process.env.CHANNEL_CODE,
    mix:       process.env.CHANNEL_MIX,
  };
}

const ROUTE_LABELS = {
  prompts:   '\uD83E\uDD16 Prompts',
  media:     '\uD83D\uDCCE Media',
  links:     '\uD83D\uDD17 Links',
  forwarded: '\uD83D\uDD04 Forwarded',
  code:      '\uD83D\uDCBB Code',
  mix:       '\uD83D\uDCE6 Mix',
};

// ── Channel fetching ────────────────────────────────────────────────────────

async function getChannel(client, channelId) {
  if (!channelId) return null;
  let channel = client.channels.cache.get(channelId);
  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch {
      return null;
    }
  }
  return channel;
}

// ── Safe send with single retry on rate limit ───────────────────────────────

async function safeSend(channel, payload) {
  try {
    return await channel.send(payload);
  } catch (err) {
    const isRateLimit = err.status === 429 || err.httpStatus === 429;
    if (isRateLimit) {
      const retryAfter = err.retryAfter || err.retry_after || 2000;
      await new Promise(r => setTimeout(r, retryAfter));
      return await channel.send(payload);
    }
    throw err;
  }
}

// ── Build embed based on route ──────────────────────────────────────────────

function buildEmbeds(parsed, user, label) {
  const route = parsed.route;

  switch (route) {
    case 'links':
      return [fmt.formatLinks(parsed, user, label)];
    case 'media':
      return [fmt.formatMedia(parsed, user, label)];
    case 'code':
      return parsed.codeBlocks.map(block => fmt.formatCode(block, user, label));
    case 'prompts':
      return [fmt.formatPrompt(parsed, user, label)];
    case 'forwarded':
      return [fmt.formatForwarded(parsed, user, label)];
    case 'mix':
    default:
      return [fmt.formatMix(parsed, user, label)];
  }
}

// ── Main routing function ───────────────────────────────────────────────────

async function routeContent(client, parsed, user, label) {
  const channels = getChannelMap();
  const route = parsed.route;
  const channelId = channels[route];
  const errors = [];
  let filedTo = null;

  if (!channelId) {
    return { filedTo: null, route, label: ROUTE_LABELS[route], errors: ['Channel not configured'] };
  }

  try {
    const channel = await getChannel(client, channelId);
    if (!channel) {
      errors.push('Channel not found');
      return { filedTo: null, route, label: ROUTE_LABELS[route], errors };
    }

    const embeds = buildEmbeds(parsed, user, label);

    const files = (parsed.attachments.length > 0 && (route === 'media' || route === 'mix' || route === 'forwarded'))
      ? parsed.attachments.map(a => ({ attachment: a.url, name: a.name }))
      : [];

    let lastMsg;
    for (const embed of embeds) {
      const payload = { embeds: [embed] };
      if (files.length > 0 && embed === embeds[0]) {
        payload.files = files;
      }
      lastMsg = await safeSend(channel, payload);
    }

    db.saveEntry(user.id, parsed, channelId, lastMsg?.id || null);
    filedTo = channelId;

  } catch (err) {
    errors.push(err.message);
  }

  return { filedTo, route, label: ROUTE_LABELS[route], errors };
}

module.exports = { routeContent };
