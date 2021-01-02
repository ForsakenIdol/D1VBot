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
      // Skip embedded messages - I might be able to use reduce() instead of looping.
      // Maybe instead of skipping embedded messages, check whether the message is embedded and if it is, insert the embedded message with an embedded keyword?
      for (var message in messages.array()) if (message !== undefined) sum_messages.push(message);
      last_id = sum_messages[sum_messages.length - 1].id;

      console.log(`Pulled ${sum_messages.length} messages from the ${channel.name} channel...`);
      if (messages.size != 100 || sum_messages.length >= limit) return sum_messages;
  }
} 

module.exports = { Discord, path, getall }