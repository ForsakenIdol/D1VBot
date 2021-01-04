const Discord = require('discord.js');
const mysql = require('mysql');
const { Message } = require("./datatypes");

async function getall(channel) {
  //const limit = Math.floor(Number.MAX_SAFE_INTEGER / 10000);
  const limit = 1000;

  if (!["dm", "text", "news"].includes(channel.type)) return null; // Skip all non-text channels
  let sum_messages = [];
  let last_id;
  console.log(`Getting a maximum of ${limit} messages from the channel ${channel.name} with ID ${channel.id}...`);
  while (true) {
      let options = { limit: 100 };
      if (last_id) options = { limit: 100, before: last_id }

      const messages = await channel.messages.fetch(options);
      // Skip embedded messages - I might be able to use reduce() instead of looping.
      // Maybe instead of skipping embedded messages, check whether the message is embedded and if it is, insert the embedded message with an embedded keyword?
      for (let i = 0; i < messages.array().length; i++) if (messages.array()[i] !== undefined) {
        // Construct and push the message object.
        sum_messages.push(new Message(
          messages.array()[i].id, messages.array()[i].content.replace(/[^\x00-\x7F]/g, ""), messages.array()[i].pinned,
          messages.array()[i].createdTimestamp, messages.array()[i].author.id, messages.array()[i].channel.id
        ));
      }
      if(sum_messages.length > 0 && last_id === sum_messages[sum_messages.length - 1].id) return sum_messages;
      else last_id = sum_messages[sum_messages.length - 1].id;


      if (sum_messages.length % 1000 === 0) console.log(`Pulled ${sum_messages.length} messages from the ${channel.name} channel...`);
      if (messages.size != 100 || sum_messages.length >= limit) return sum_messages;
  }
} 

module.exports = { Discord, mysql, getall }