const { Discord, mysql, getall, prefix, help_message } = require("./utils");
const { Guild, User, Channel, Message } = require("./datatypes");

const db = mysql.createConnection({
  host: process.env.DBHOST,
  user: process.env.DBUSERNAME,
  password: process.env.DBPASSWORD,
  database: process.env.DBNAME,
  port: process.env.DBPORT
});

const client = new Discord.Client();
const admins = [
  '199792741058609153', /* ELL1, ARE3 */
  '309501599313821708' /* ForsakenIdol */
]

client.on('ready', () => {
  console.log(`\nLogged in as ${client.user.tag}!`);
  client.user.setPresence({ status: "online", activity: { name: `Type ${prefix}help for help with commands!` } });
  // Initialize MySQL connection
  db.connect(err => {
    if (err) {console.log(err); throw new Error("Error connecting to the database.");}
    else {
      console.log("Connected to the MySQL container!");
      // Drop the contents of all the tables
      new Promise((resolve, reject) => {
        console.log("Clearing all database tables...");
        let tablesCleared = 0;
        let tables = ["messages", "channels", "guilds", "users"]
        tables.forEach(table => {
          db.query(`DELETE FROM ${table};`, (err, result, fields) => {
            if (err) {console.log(err); reject(new Error(`Could not delete from the ${table} table.`));}
            else { tablesCleared++; if (tablesCleared === tables.length) resolve(); }
          });
        });
      }).then(() => console.log("Cleared all database tables!")).catch(error => {throw new Error(error)});

      // Once table information has been cleared, we can pull information for each guild and insert that information into the database.
      const Guilds = client.guilds.cache;
      Guilds.forEach(guild => {

        // Insert all users from this guild into the database
        guild.members.fetch().then(members => {
          members.forEach(member => {
            const user = member.user;
            db.query("INSERT INTO users(id, username, bot, discriminator) VALUES(?, ?, ?, ?);",
            [user.id, user.username, user.bot ? 1 : 0, user.discriminator], (users_err, result, fields) => {
              if (users_err) throw new Error(users_err);
            })
          });
        }).then(() => {
          console.log("All users added to database!");
          // Insert information about this guild into the database
          db.query("INSERT INTO guilds VALUES(?, ?, ?, ?);", [guild.id, guild.name, guild.nameAcronym, guild.ownerID], (err, result, fields) => {
            if (err) console.log(err);
            else console.log(`Successfully inserted guild ${guild.name} into the database.`);
          });
        }).then(() => {
          console.log(`\nScraping each channel in ${guild.name}...\n`);
          guild.channels.cache.forEach(channel => {
            // Insert each channel into the database
            db.query("INSERT INTO channels VALUES(?, ?, ?, ?);", [channel.id, channel.name, channel.type, guild.id], (err, result, fields) => {
              if (err) {console.log(channel.type); throw new Error(err);}
              // If there is no error, scrape each channel and insert the messages into the database
              else getall(channel)
              .then(messages => {
                // Handle messages here
                if (messages === null) console.log(`Skipped non-text channel ${channel.name}!`);
                else {
                  console.log(`[TOTAL] Pulled a total of ${messages.length} messages from the "#${channel.name}" channel. Inserting into the database now.`);
                  messages.forEach(message => {
                    db.query("INSERT INTO messages(id, content, pinned, createdTimestamp, user_id, channel_id) VALUES(?, ?, ?, ?, ?, ?);",
                      [message.id, message.content, message.pinned,
                      Discord.SnowflakeUtil.deconstruct(message.createdTimestamp.toString(10)).date,
                      message.user_id, message.channel_id], (err, result, fields) => {
                        if (err) {
                          console.log(err.sql);
                          throw new Error(err);
                        }
                      }
                    );
                  });
                }
              })
              .catch(error => {console.log(`\nError while fetching from ${channel.name}!`); console.log(error);});
            });  
          });
        }).catch(error => {throw new Error(error);});

      });
    }
  });
});

client.on('message', msg => {
  // First, add this message to the database.
  db.query("INSERT INTO messages(id, content, pinned, createdTimestamp, user_id, channel_id) VALUES(?, ?, ?, ?, ?, ?)",
           [msg.id, msg.content, msg.pinned ? 1 : 0, 
            Discord.SnowflakeUtil.deconstruct(msg.createdTimestamp.toString(10)).date,
            msg.author.id, msg.channel.id], (err, result, fields) => {
    if (err) console.log(err);
  });

  // Then, check if the message called a command.
  if (msg.content.startsWith(prefix)) {
    const components = msg.content.split(' ');
    components[0] = components[0].replace("--", "");
    console.log(components);
    switch (components[0].toLowerCase()) {
      case 'help':
        msg.channel.send(help_message);
        break;
      // Removes any number of messages from this channel.
      // Does not check whether the user tries to remove more messages than there are currently in the channel.
      case 'rm':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else if (components.length != 2 || !parseInt(components[1])) msg.channel.send(`Incorrect usage. This command expects 2 arguments. Use \`${prefix}rm <num>\` to remove the last \`num\` messages in this channel.`);
        else if (parseInt(components[1]) > 20) msg.channel.send("You can only delete up to 20 messages at a single time.");
        else {
          const numDelete = parseInt(components[1]);
          // Clear the last 'numDelete' messages
          msg.channel.bulkDelete(numDelete).then(deletedMessages => {
            deletedMessages.forEach(message => {
              console.log(message);
              db.query(`UPDATE messages SET deleted=1 WHERE id=?;`, [message.id], (err, result, fields) => {
                if (err) {
                  console.log(err);
                  console.log(`Could not delete message with content ${message.content}.`);
                } else console.log(`Deleted message with content "${message.content}" by ${message.author.username}.`);
              });
            })
          }).then(() => {
            console.log(`Cleared ${numDelete} messages!`);
            msg.channel.send(`<@${msg.author.id}> cleared ${numDelete} messages.`).then(response => setTimeout(() => response.delete(), 5000));
          });
        }
        break;
      case 'shutdown':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else {
          console.log("Shutdown requested.");
          msg.channel.send("Shutting down D1VBot... Goodbye.");
          setTimeout(() => {client.destroy();}, 1000);
        }
      case 'ping':
        msg.channel.send(`:ping_pong: Bot latency is ${Math.abs(msg.createdTimestamp - Date.now())}ms. API latency is ${client.ws.ping}ms.`);
        break;
      case 'whoami':
        if (components.length != 1) msg.channel.send(`Usage: \`${prefix}whoami\` without command arguments.`);
        else msg.channel.send(`Detected user \`${msg.author.username}\` with discriminator \`${msg.author.discriminator}\` and user ID \`${msg.author.id}\`.`);
        break;
      case 'stats':
        if (components.length == 1) {
          // User self-requested stats.
          msg.channel.send(`<@!${msg.author.id}> requested stats on themselves. Coming soon.`);
        } else if (components.length == 2) { // Whitespace is stripped, so the second component can never be empty.
          if (components[1] == msg.author.id) msg.channel.send(`<@!${msg.author.id}> requested stats on themselves. Coming soon.`);
          else if (components[1].length != 18 || !/^\d+$/.test(components[1])) msg.channel.send(`Usage: \`${prefix}stats\` to self-query stats or \`${prefix}stats <userid>\` to query stats on another user based on their ID. You can use \`${prefix}whoami\` to get your own user ID.`);
          else {
            // User requested stats on another user. Can only provide the user ID.
            msg.channel.send(`<@!${msg.author.id}> requested stats on user <@!${components[1]}>. Coming soon.`);
          }
        } else msg.channel.send(`Usage: \`${prefix}stats\` to self-query stats or \`${prefix}stats <userid>\` to query stats on another user based on their ID. You can use \`${prefix}whoami\` to get your own user ID.`);
        break;
      default:
        break;
    }
  }
});

client.on('messageDelete', msg => {
  db.query(`UPDATE messages SET deleted = 1 WHERE id = ?;`, [msg.id], (err, result, fields) => {
    if (err) console.log(err);
    else console.log(`${msg.author.username + "#" + msg.author.discriminator} deleted their message with content "${msg.content}".`);
  });
});

client.on('userUpdate', (oldUser, newUser) => {
  let new1 = new User(newUser.id, newUser.username, newUser.bot ? 1 : 0, newUser.discriminator);
  if (oldUser.id !== new1.id) console.log(`There was a problem. User with old username ${oldUser.username} and new username ${newUser.username} has had their ID changed from ${oldUser.id} to ${newUser.id}.`);
  else db.query("UPDATE users SET username = ? AND bot = ? AND discriminator = ? WHERE id = ?;",
                [new1.username, new1.bot, new1.discriminator, new1.id], (err, result, fields) => {
                  if (err) throw new Error(err);
                  else console.log(new1);
                });
});

client.on('guildMemberAdd', member => {
  db.query("INSERT INTO users(id, username, bot, discriminator) VALUES(?, ?, ?, ?);",
           [member.id, member.user.username, member.user.bot ? 1 : 0, member.user.discriminator], (err, result, fields) => {
              if (err) throw new Error(err);
              else console.log(`User ${member.user.username}#${member.user.discriminator} has joined the guild and has been added to the database!`);
  });
});

client.on('guildMemberRemove', member => {
  db.query("DELETE FROM users WHERE id = ?;", [member.id], (err, result, fields) => {
    if (err) throw new Error(err);
    else console.log(`User ${member.user.username}#${member.user.discriminator}  has left the guild and has been removed from the database.`);
  })
});

client.on('guildUpdate', (oldGuild, newGuild) => {
  db.query("UPDATE guilds SET name = ? AND acronym = ? AND owner_id = ? WHERE id = ?;",
           [newGuild.name, newGuild.nameAcronym, newGuild.ownerID], (err, result, fields) => {
              if (err) throw new Error(err);
              else console.log(`The guild with previous name ${oldGuild.name} has been updated to ${newGuild.name}.`);
           });
});

// This promise resolves with the bot's API token - do not log this!
client.login(process.env.BOTAPITOKEN).catch(error => {throw new Error(error);});