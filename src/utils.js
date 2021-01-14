const Discord = require('discord.js');
const mysql = require('mysql');
const { Message } = require("./datatypes");

const db = mysql.createConnection({
  host: process.env.DBHOST,
  user: process.env.DBUSERNAME,
  password: process.env.DBPASSWORD,
  database: process.env.DBNAME,
  port: process.env.DBPORT,
  multipleStatements: true
});

async function getall(channel, limit) {

  if (!["dm", "text", "news"].includes(channel.type)) return null; // Skip all non-text channels
  let sum_messages = [];
  let last_id;
  console.log(`Scraping channel ${channel.name} with ID ${channel.id}...`);
  while (true) {
      let options = { limit: 100 };
      if (last_id) options = { limit: 100, before: last_id }

      const messages = await channel.messages.fetch(options);
      // Skip embedded messages - I might be able to use reduce() instead of looping.
      // Maybe instead of skipping embedded messages, check whether the message is embedded and if it is, insert the embedded message with an embedded keyword?
      for (let i = 0; i < messages.array().length; i++) if (messages.array()[i] !== undefined) {
        // Construct and push the message object.
        sum_messages.push(new Message(
          messages.array()[i].id, messages.array()[i].content, messages.array()[i].pinned,
          messages.array()[i].createdTimestamp, messages.array()[i].author.id, messages.array()[i].channel.id
        ));
      }
      if(sum_messages.length > 0 && last_id === sum_messages[sum_messages.length - 1].id) return sum_messages;
      else last_id = sum_messages[sum_messages.length - 1].id;


      if (sum_messages.length % 1000 === 0) console.log(`Pulled ${sum_messages.length} messages from the ${channel.name} channel...`);
      if (messages.size != 100 || sum_messages.length >= limit) return sum_messages;
  }
} 

const getStats = (user_id, msg) => {
  let stats_message = "";
  db.query("SELECT * FROM total_messages;", (err, result, fields) => {
    if (err) console.log(err);
    else {
      // Find the rank of this user
      let found = false;
      for (let i = 0; i < result.length; i++) {
        if (result[i].user_id === user_id) {
          if (user_id == '793858225878990879') stats_message += `<@${user_id}> (hey that's me!)`; // This is D1VBot's user ID.
          else stats_message += `<@${user_id}>`;
          stats_message += ` has sent ${result[i].total_messages} out of the last ${result[0].total_messages} messages across all channels in ${msg.channel.guild.name}, placing them at rank ${i} out of ${result.length}.\n`;
          found = true;
          break;
        }
      } if (!found) stats_message += `<@${user_id}> has not sent any messages yet out of the last 1000 messages in ${msg.channel.guild.name}.\n`;
      db.query("SELECT C.name, M.num_messages_count FROM messages_per_channel M JOIN channels C ON M.channel_id = C.id WHERE user_id = ? ORDER BY num_messages_count DESC;", [user_id], (err, result, fields) => {
        if (err) console.log(err);
        else {
          stats_message += "**Breakdown per Channel**\n";
          for (let i = 0; i < result.length; i++) stats_message += `- ${msg.guild.channels.cache.find(channel => channel.name === result[i].name).toString()}: ${result[i].num_messages_count} messages.\n`;
          msg.channel.send(stats_message);
        }
      });
    }
  });
}

module.exports = { Discord, mysql, getall, getStats, db }