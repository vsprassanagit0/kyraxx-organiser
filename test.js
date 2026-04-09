require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const c = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

c.on('ready', () => {
  console.log('READY as', c.user.tag);
  console.log('Waiting for DMs... send one now');
});

c.on('raw', (e) => {
  if (e.t === 'MESSAGE_CREATE') {
    console.log('RAW EVENT:', JSON.stringify(e.d).slice(0, 300));
  }
});

c.on('messageCreate', (msg) => {
  console.log('MESSAGE:', msg.channel.type, msg.author.tag, msg.content.slice(0, 100));
});

c.login(process.env.DISCORD_TOKEN);
