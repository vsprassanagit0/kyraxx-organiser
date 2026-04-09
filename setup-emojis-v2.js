// ── Kyraxx Organiser - Upload 30 NEW emojis (10 static + 20 animated) ───────
// Run: node setup-emojis-v2.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const EMOJIS = {
  // 10 Static
  k_star:         'https://cdn3.emoji.gg/emojis/6813-gold-star.png',
  k_crown:        'https://cdn3.emoji.gg/emojis/1279-neon-green-crown.png',
  k_fire:         'https://cdn3.emoji.gg/emojis/2380-burning.png',
  k_heart:        'https://cdn3.emoji.gg/emojis/7181-neon-heart-emoji.png',
  k_shield:       'https://cdn3.emoji.gg/emojis/9954-blurple-shield.png',
  k_bolt:         'https://cdn3.emoji.gg/emojis/79050-bolt.png',
  k_gem:          'https://cdn3.emoji.gg/emojis/8465-purple-diamond-gem.png',
  k_clock:        'https://cdn3.emoji.gg/emojis/9904-clock.png',
  k_tag:          'https://cdn3.emoji.gg/emojis/6427-tag.png',
  k_wave:         'https://cdn3.emoji.gg/emojis/2751-wavehello.png',

  // 20 Animated
  k_anim_fire:    'https://cdn3.emoji.gg/emojis/5211-fire-emojis.gif',
  k_anim_star:    'https://cdn3.emoji.gg/emojis/3231-starspin.gif',
  k_anim_heart:   'https://cdn3.emoji.gg/emojis/11637-beatingheart.gif',
  k_anim_crown:   'https://cdn3.emoji.gg/emojis/1105-crown.gif',
  k_anim_bolt:    'https://cdn3.emoji.gg/emojis/8775-lightningbolt.gif',
  k_anim_wave:    'https://cdn3.emoji.gg/emojis/4958-waving.gif',
  k_anim_rocket:  'https://cdn3.emoji.gg/emojis/69955-rocket-animated.gif',
  k_anim_party:   'https://cdn3.emoji.gg/emojis/83280-confettipopper.gif',
  k_anim_eyes:    'https://cdn3.emoji.gg/emojis/5845-eyeshaking.gif',
  k_anim_gear:    'https://cdn3.emoji.gg/emojis/4655_gearSpinning.gif',
  k_anim_alert:   'https://cdn3.emoji.gg/emojis/4396-ringing-bell.gif',
  k_anim_rainbow: 'https://cdn3.emoji.gg/emojis/2574_Rainbow_Heart.gif',
  k_anim_coin:    'https://cdn3.emoji.gg/emojis/2253-sonic-coin-spin.gif',
  k_anim_ping:    'https://cdn3.emoji.gg/emojis/4381-anouncements-animated.gif',
  k_anim_verify:  'https://cdn3.emoji.gg/emojis/4568_aVerified.gif',
  k_anim_arrow:   'https://cdn3.emoji.gg/emojis/73288-animated-arrow-red.gif',
  k_anim_music:   'https://cdn3.emoji.gg/emojis/3403-music-notes.gif',
  k_anim_chat:    'https://cdn3.emoji.gg/emojis/3445_Typing.gif',
  k_anim_lock:    'https://cdn3.emoji.gg/emojis/44503-lock-key.gif',
  k_anim_globe:   'https://cdn3.emoji.gg/emojis/2308-globe-spin.gif',
};

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'KyraxxBot/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function uploadEmoji(name, imageBuffer, isAnimated) {
  const mime = isAnimated ? 'image/gif' : 'image/png';
  const base64 = `data:${mime};base64,${imageBuffer.toString('base64')}`;
  const body = JSON.stringify({ name, image: base64 });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com',
      path: `/api/v10/guilds/${GUILD_ID}/emojis`,
      method: 'POST',
      headers: {
        'Authorization': `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`${name}: HTTP ${res.statusCode} - ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n  Kyraxx Organiser - Emoji Setup v2');
  console.log('  ==================================');
  console.log(`  Uploading ${Object.keys(EMOJIS).length} new emojis...\n`);

  const results = {};
  let count = 0;

  for (const [name, url] of Object.entries(EMOJIS)) {
    count++;
    const isAnimated = url.endsWith('.gif');
    const prefix = isAnimated ? '<a:' : '<:';

    process.stdout.write(`  [${String(count).padStart(2)}/${Object.keys(EMOJIS).length}] ${name.padEnd(18)} `);

    try {
      const buffer = await download(url);

      // Check file size (Discord limit: 256KB for emojis)
      if (buffer.length > 256 * 1024) {
        console.log(`SKIP (${(buffer.length/1024).toFixed(0)}KB > 256KB limit)`);
        continue;
      }

      const emoji = await uploadEmoji(name, buffer, isAnimated);
      const emojiStr = `${prefix}${emoji.name}:${emoji.id}>`;
      results[name] = emojiStr;
      console.log(`OK  ${emojiStr}`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.log(`FAIL  ${err.message.slice(0, 100)}`);
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
        count--; // retry
      }
    }
  }

  console.log(`\n  Uploaded: ${Object.keys(results).length}/${Object.keys(EMOJIS).length}`);

  // Auto-update emojis.js
  if (Object.keys(results).length > 0) {
    const emojiPath = path.join(__dirname, 'src', 'emojis.js');
    let file = fs.readFileSync(emojiPath, 'utf8');

    // Add new entries to CUSTOM object (before the closing };)
    const newEntries = Object.entries(results).map(([name, str]) =>
      `  ${name.padEnd(16)}: '${str}',`
    ).join('\n');

    // Insert before the closing }; of CUSTOM
    file = file.replace(
      /(\s*\/\/ ── Animated emojis ──\n[\s\S]*?k_pulse:\s*'[^']*',)\n(\};)/,
      `$1\n\n  // ── Extra emojis (v2) ──\n${newEntries}\n$2`
    );

    // Also add to FALLBACK
    const fallbackEntries = [];
    for (const name of Object.keys(results)) {
      if (name.startsWith('k_anim_')) {
        fallbackEntries.push(`  ${name.padEnd(16)}: '\\u2728',            // fallback`);
      } else {
        const fallbacks = {
          k_star: "'\\u2B50'", k_crown: "'\\uD83D\\uDC51'", k_fire: "'\\uD83D\\uDD25'",
          k_heart: "'\\u2764\\uFE0F'", k_shield: "'\\uD83D\\uDEE1\\uFE0F'",
          k_bolt: "'\\u26A1'", k_gem: "'\\uD83D\\uDC8E'", k_clock: "'\\uD83D\\uDD50'",
          k_tag: "'\\uD83C\\uDFF7\\uFE0F'", k_wave: "'\\uD83D\\uDC4B'",
        };
        fallbackEntries.push(`  ${name.padEnd(16)}: ${fallbacks[name] || "'\\u2728'"},`);
      }
    }

    file = file.replace(
      /(k_pulse:\s*'[^']*',\s*\/\/[^\n]*\n)(\};[\s\S]*?\/\/ ── Emoji getter)/,
      `$1\n  // ── Extra emojis (v2) ──\n${fallbackEntries.join('\n')}\n$2`
    );

    fs.writeFileSync(emojiPath, file);
    console.log('  emojis.js updated!\n');
    console.log('  Restart bot: npx pm2 restart kyraxx\n');
  }
}

main().catch(console.error);
