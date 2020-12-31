const Discord = require('discord.js');
const path = require('path');

async function getall(channel, limit = 500) {
  if (channel.type === 'voice') {
    console.log(`${channel.name} is a voice channel. Skipping...`);
    return null;
  }
  const sum_messages = [];
  let last_id;
  console.log(`Getting a maximum of ${limit} messages from the channel ${channel.name}.`);
  while (true) {
      const options = { limit: 100 };
      if (last_id) options.before = last_id;

      const messages = await channel.messages.fetch(options);
      sum_messages.push(...messages.array());
      last_id = messages.last().id;

      console.log(`Pulled ${sum_messages.length} messages...`);
      if (messages.size != 100 || sum_messages.length >= limit) return sum_messages;
  }
} 

module.exports = { Discord, path, getall }