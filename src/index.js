const { Discord, mysql, getall, getStats, cleanUser, db } = require("./utils");
const { Guild, User, Channel, Message } = require("./datatypes");

const client = new Discord.Client();
const admins = [
  '199792741058609153', /* ELL1, ARE3 */
  '309501599313821708' /* ForsakenIdol */
]
let prefix = process.env.PREFIX;

client.on('ready', () => {
  console.log(`\nLogged in as ${client.user.tag}! My prefix is '${prefix}'.`);
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
              else getall(channel, Math.floor(Number.MAX_SAFE_INTEGER / 10000))
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

  console.log(`[${Date.now()}] ${msg.author.username}#${msg.author.discriminator} sent '${msg.content}'.`);

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
    components[0] = components[0].replace(prefix, "");
    console.log(components);
    switch (components[0].toLowerCase()) {
      case 'help':
        let help_message = `\
Welcome to D1VBot! My prefix is \`${prefix}\`.\nSome things you can ask me include:
- \`${prefix}ping\`: Gets the bot's local and API ping.
- \`${prefix}help\`: Displays this message.
- \`${prefix}whoami\`: Displays key user statistics about yourself. Useful for coding.
- \`${prefix}stats\`: Get message stats about yourself.
- \`${prefix}stats <id>\`: Get message stats about another user using their ID. I WILL restrict this if people abuse it.
- \`${prefix}wallofdeath\`: ...just why? For those who truly wish to drown.
**Admin Commands**
- \`${prefix}rm <num>\`: Removes \`num\` messages from the channel it was called in.
- \`${prefix}prefix <new>\`: Changes the bot's prefix.
- \`${prefix}shutdown\`: Gracefully terminates the bot.
- \`${prefix}clean <id>\`: Removes all messages sent by a user in this guild.
- \`${prefix}purge <id>\`: Purges a user. Removes all their messages and kicks them from the guild.
- \`${prefix}silence <id>\`: Mutes a user in all voice and text channels.
- \`${prefix}vocalize <id>\`: Unmutes a user in all voice and text channels.
`
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
        break;
      case 'ping':
        msg.channel.send(`:ping_pong: Bot latency is ${Math.abs(msg.createdTimestamp - Date.now())}ms. API latency is ${client.ws.ping}ms.`);
        break;
      case 'whoami':
        if (components.length != 1) msg.channel.send(`Usage: \`${prefix}whoami\` without command arguments.`);
        else msg.channel.send(`Detected user \`${msg.author.username}\` with discriminator \`${msg.author.discriminator}\` and user ID \`${msg.author.id}\`.`);
        break;
      case 'stats':
        if (components.length == 1) getStats(msg.author.id, msg); // User self-requested stats.
        else if (components.length == 2) { // Whitespace is stripped, so the second component can never be empty.
          if (components[1] == msg.author.id) getStats(msg.author.id, msg); // Another way to self-request stats.
          else if (components[1].length != 18 || !/^\d+$/.test(components[1])) msg.channel.send(`Usage: \`${prefix}stats\` to self-query stats or \`${prefix}stats <userid>\` to query stats on another user based on their ID. You can use \`${prefix}whoami\` to get your own user ID.`);
          else getStats(components[1], msg);
        } else msg.channel.send(`Usage: \`${prefix}stats\` to self-query stats or \`${prefix}stats <userid>\` to query stats on another user based on their ID. You can use \`${prefix}whoami\` to get your own user ID.`);
        break;
      case 'wallofdeath':
        if (!(components.length == 2 && !isNaN(components[1]) && parseInt(components[1]) > 0)) msg.channel.send("**YOU DARE FACE THE WALL OF DEATH WITHOUT KNOWING HOW TO CALL IT?!**");
        else {
          // Get how many pings this user wants
          let num_pings = parseInt(components[1]);
          let ping_wall = "";
          for (let i = 0; i < num_pings; i++) ping_wall += `<@${msg.author.id}> `;
          msg.channel.send(ping_wall);
        }
        break;
      case 'prefix':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else if (components.length != 2) msg.channel.send(`Usage: \`${prefix}prefix <new>\` to change to a new prefix. The new prefix must only consist of symbols.`);
        else if (!/[`~!@#$%^&*_=+\|\-\(\)\{\}\[\]<>;:'",<>]{1,3}/.test(components[1])) msg.channel.send("New prefix is invalid.");
        else {
          let oldprefix = process.env.PREFIX;
          prefix = components[1]; process.env.PREFIX = components[1];
          msg.channel.send(`Successfully changed D1VBot's prefix from \`${oldprefix}\` to \`${prefix}\`.`);
        }
      case 'clean':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else if (components.length != 2 || !/^\d+$/.test(components[1])) msg.channel.send(`Incorrect usage of \`${prefix}clean\`.`);
        else if (components[1] == msg.author.id) msg.channel.send(`Don't try to clear out your own messages, <@${msg.author.id}>!`);
        else if (components[1] == '309501599313821708') msg.channel.send(`You dared to try this command on the bot author <@309501599313821708>?`);
        else cleanUser(components[1], msg);
        break;
      case 'purge':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else if (components.length != 2 || !/^\d+$/.test(components[1])) msg.channel.send(`Incorrect usage of \`${prefix}purge\`.`);
        else if (components[1] == msg.author.id) msg.channel.send(`Don't try to ${components[0].toLowerCase()} yourself, <@${msg.author.id}>!`);
        else if (components[1] == '309501599313821708') msg.channel.send(`You dared to try this command on the bot author <@309501599313821708>?`);
        else {
          cleanUser(components[1], msg);
          msg.guild.members.fetch(components[1])
          .then(guildUser => {
            guildUser.kick("Purge command called on user.").then(() => {
              msg.channel.send(`${guildUser.user.username}#${guildUser.user.discriminator} has been purged from ${msg.guild.name}.`)
            });
          })
          .catch(error => console.log(error));
        }
        break;
      case 'silence':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else if (components.length != 2 || !/^\d+$/.test(components[1])) msg.channel.send(`Incorrect usage of \`${prefix}silence\`.`);
        else if (components[1] == msg.author.id) msg.channel.send(`Don't try to ${components[0].toLowerCase()} yourself, <@${msg.author.id}>!`);
        else if (components[1] == '309501599313821708') msg.channel.send(`You dared to try this command on the bot author <@309501599313821708>?`);
        else {
          msg.guild.members.fetch(components[1]).then(member => {
            let mutedRoles = msg.guild.roles.cache.filter(role => role.name === "Silenced").array();
            console.log([mutedRoles]);
            member.roles.set(mutedRoles);
            msg.channel.send(`You have been silenced, <@${components[1]}>. Do not attempt to resist.`);
          }).catch(error => console.log(error));
        }
        break;
      case 'vocalize':
        if (!admins.includes(msg.author.id)) msg.channel.send("Not enough permissions to use this command.");
        else if (components.length != 2 || !/^\d+$/.test(components[1])) msg.channel.send(`Incorrect usage of \`${prefix}vocalize\`.`);
        else {
          msg.guild.members.fetch(components[1]).then(member => {
            member.roles.remove(msg.guild.roles.cache.filter(role => role.name === "Silenced").array()[0]);
            member.roles.add(msg.guild.roles.cache.filter(role => role.name === "Witness").array()[0]);
            msg.channel.send(`<@${components[1]}> has been vocalized!`);
          }).catch(error => console.log(error));
        }
        break;
      default:
        break;
    }
  }
});

client.on('messageDelete', msg => {
  db.query(`UPDATE messages SET deleted = 1 WHERE id = ?;`, [msg.id], (err, result, fields) => {
    if (err) console.log(err);
    else console.log(`${msg.author.username + "#" + msg.author.discriminator}'s message with content "${msg.content}" was deleted.`);
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

client.on('guildUpdate', (oldGuild, newGuild) => {
  db.query("UPDATE guilds SET name = ? AND acronym = ? AND owner_id = ? WHERE id = ?;",
           [newGuild.name, newGuild.nameAcronym, newGuild.ownerID], (err, result, fields) => {
              if (err) throw new Error(err);
              else console.log(`The guild with previous name ${oldGuild.name} has been updated to ${newGuild.name}.`);
           });
});

// This promise resolves with the bot's API token - do not log this!
client.login(process.env.BOTAPITOKEN).catch(error => {throw new Error(error);});