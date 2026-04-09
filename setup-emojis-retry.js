// ── Upload remaining 11 animated emojis (run after rate limit expires ~45 min)
// Run: node setup-emojis-retry.js
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const EMOJIS = {
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
      if (res.statusCode === 301 || res.statusCode === 302) return download(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function upload(name, buf) {
  const base64 = `data:image/gif;base64,${buf.toString('base64')}`;
  const body = JSON.stringify({ name, image: base64 });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com', path: `/api/v10/guilds/${GUILD_ID}/emojis`, method: 'POST',
      headers: { 'Authorization': `Bot ${TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => res.statusCode < 300 ? resolve(JSON.parse(data)) : reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0,150)}`)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n  Uploading 11 remaining animated emojis...\n');
  const results = {};
  let i = 0;
  for (const [name, url] of Object.entries(EMOJIS)) {
    i++;
    process.stdout.write(`  [${i}/11] ${name.padEnd(18)} `);
    try {
      const buf = await download(url);
      if (buf.length > 256 * 1024) { console.log('SKIP (too large)'); continue; }
      const emoji = await upload(name, buf);
      const str = `<a:${emoji.name}:${emoji.id}>`;
      results[name] = str;
      console.log(`OK  ${str}`);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`FAIL  ${err.message.slice(0,80)}`);
      if (err.message.includes('429')) {
        const match = err.message.match(/retry_after[":]*\s*([\d.]+)/);
        const wait = match ? Math.ceil(parseFloat(match[1])) : 60;
        console.log(`  Rate limited. Try again in ${Math.ceil(wait/60)} minutes.`);
        break;
      }
    }
  }

  if (Object.keys(results).length > 0) {
    const emojiPath = path.join(__dirname, 'src', 'emojis.js');
    let file = fs.readFileSync(emojiPath, 'utf8');
    for (const [name, str] of Object.entries(results)) {
      file = file.replace(new RegExp(`(${name}:\\s*)'',`), `$1'${str}',`);
    }
    fs.writeFileSync(emojiPath, file);
    console.log(`\n  Updated emojis.js with ${Object.keys(results).length} emojis.`);
    console.log('  Restart: npx pm2 restart kyraxx\n');
  }
}

main().catch(console.error);
