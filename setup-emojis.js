// ── Kyraxx Organiser - Auto Emoji Setup ─────────────────────────────────────
// Downloads emojis from emoji.gg and uploads them to your Discord server.
// Run: node setup-emojis.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID in .env');
  process.exit(1);
}

// ── Emoji sources ───────────────────────────────────────────────────────────

const EMOJIS = {
  // Static emojis (.png)
  k_link:      'https://cdn3.emoji.gg/emojis/8512-blurple-link.png',
  k_code:      'https://cdn3.emoji.gg/emojis/6289-terminal.png',
  k_media:     'https://cdn3.emoji.gg/emojis/1301-photo.png',
  k_prompt:    'https://cdn3.emoji.gg/emojis/7122_bigbrain.png',
  k_forward:   'https://cdn3.emoji.gg/emojis/2522-arrow.png',
  k_mix:       'https://cdn3.emoji.gg/emojis/3303-puzzle-icon.png',
  k_pin:       'https://cdn3.emoji.gg/emojis/16848-pushpin.png',
  k_note:      'https://cdn3.emoji.gg/emojis/26099-notepad.png',
  k_file:      'https://cdn3.emoji.gg/emojis/9583-folder.png',
  k_check:     'https://cdn3.emoji.gg/emojis/8277-green-verified.png',
  k_stats:     'https://cdn3.emoji.gg/emojis/4260-bar-chart.png',
  k_search:    'https://cdn3.emoji.gg/emojis/9027-magnifying-glass.png',
  k_inbox:     'https://cdn3.emoji.gg/emojis/9583-folder.png',
  k_video:     'https://cdn3.emoji.gg/emojis/7215-youtube-playbutton.png',
  k_social:    'https://cdn3.emoji.gg/emojis/8137_SpeechBubble.png',
  k_article:   'https://cdn3.emoji.gg/emojis/News.png',
  k_ai:        'https://cdn3.emoji.gg/emojis/9435-blurple-bot.png',
  k_music:     'https://cdn3.emoji.gg/emojis/8693-youtube-music.png',
  k_store:     'https://cdn3.emoji.gg/emojis/9183-shoppingcart.png',
  k_docs:      'https://cdn3.emoji.gg/emojis/26099-notepad.png',
  k_image:     'https://cdn3.emoji.gg/emojis/1301-photo.png',
  k_web:       'https://cdn3.emoji.gg/emojis/1119-globe.png',
  k_file_img:  'https://cdn3.emoji.gg/emojis/1301-photo.png',
  k_file_vid:  'https://cdn3.emoji.gg/emojis/7215-youtube-playbutton.png',
  k_file_aud:  'https://cdn3.emoji.gg/emojis/8693-youtube-music.png',
  k_file_doc:  'https://cdn3.emoji.gg/emojis/26099-notepad.png',
  k_file_code: 'https://cdn3.emoji.gg/emojis/6289-terminal.png',
  k_file_zip:  'https://cdn3.emoji.gg/emojis/3303-puzzle-icon.png',

  // Animated emojis (.gif)
  k_loading:   'https://cdn3.emoji.gg/emojis/loading.gif',
  k_sparkle:   'https://cdn3.emoji.gg/emojis/5117-littletwinstarssparkle.gif',
  k_success:   'https://cdn3.emoji.gg/emojis/4568_aVerified.gif',
  k_typing:    'https://cdn3.emoji.gg/emojis/3445_Typing.gif',
  k_pulse:     'https://cdn3.emoji.gg/emojis/7992-orb.gif',
};

// ── Download image as base64 ────────────────────────────────────────────────

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

// ── Upload emoji to Discord ─────────────────────────────────────────────────

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
          reject(new Error(`Upload ${name}: HTTP ${res.statusCode} - ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('  Kyraxx Organiser - Emoji Setup');
  console.log('  ==============================');
  console.log(`  Server: ${GUILD_ID}`);
  console.log(`  Emojis: ${Object.keys(EMOJIS).length}`);
  console.log('');

  const results = {};
  const errors = [];
  let count = 0;

  for (const [name, url] of Object.entries(EMOJIS)) {
    count++;
    const isAnimated = url.endsWith('.gif');
    const prefix = isAnimated ? '<a:' : '<:';

    process.stdout.write(`  [${String(count).padStart(2)}/${Object.keys(EMOJIS).length}] ${name}... `);

    try {
      const buffer = await download(url);
      const emoji = await uploadEmoji(name, buffer, isAnimated);
      const emojiStr = `${prefix}${emoji.name}:${emoji.id}>`;
      results[name] = emojiStr;
      console.log(`OK  ${emojiStr}`);

      // Rate limit: wait 1.5s between uploads
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.log(`FAIL  ${err.message}`);
      errors.push({ name, error: err.message });

      // If rate limited, wait longer
      if (err.message.includes('429')) {
        console.log('  Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  // ── Generate updated emojis.js ──────────────────────────────────────────

  console.log('');
  console.log('  Results:');
  console.log(`  Success: ${Object.keys(results).length}`);
  console.log(`  Failed:  ${errors.length}`);

  if (Object.keys(results).length > 0) {
    // Build the CUSTOM object entries
    const lines = Object.entries(results).map(([name, str]) =>
      `  ${name.padEnd(14)}: '${str}',`
    );

    const configContent = `// ── AUTO-GENERATED by setup-emojis.js ──
// Paste this into the CUSTOM object in src/emojis.js

const CUSTOM = {
${lines.join('\n')}
};
`;

    const outPath = path.join(__dirname, 'emoji-config-output.txt');
    fs.writeFileSync(outPath, configContent);
    console.log(`\n  Config saved to: ${outPath}`);
    console.log('  Copy the CUSTOM object into src/emojis.js');

    // Also auto-update emojis.js directly
    const emojiPath = path.join(__dirname, 'src', 'emojis.js');
    let emojiFile = fs.readFileSync(emojiPath, 'utf8');

    for (const [name, str] of Object.entries(results)) {
      // Replace empty strings with the emoji string
      const regex = new RegExp(`(${name}:\\s*)'',`, 'g');
      emojiFile = emojiFile.replace(regex, `$1'${str}',`);
    }

    fs.writeFileSync(emojiPath, emojiFile);
    console.log('  emojis.js auto-updated!');
  }

  if (errors.length > 0) {
    console.log('\n  Failed emojis:');
    for (const e of errors) {
      console.log(`    ${e.name}: ${e.error}`);
    }
  }

  console.log('\n  Done! Restart the bot: npx pm2 restart kyraxx\n');
}

main().catch(console.error);
