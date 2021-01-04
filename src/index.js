const { Discord, mysql, getall } = require("./utils");
const { Guild, User, Channel, Message } = require("./datatypes");

const db = mysql.createConnection({
  host: process.env.DBHOST,
  user: process.env.DBUSERNAME,
  password: process.env.DBPASSWORD,
  database: process.env.DBNAME,
  port: process.env.DBPORT
});

const client = new Discord.Client();

client.on('ready', () => {
  console.log(`\nLogged in as ${client.user.tag}!`);
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
            db.query("INSERT INTO users VALUES(?, ?, ?, ?);", [user.id, user.username.replace(/[^\x00-\x7F]/g, ""), user.bot ? 1 : 0, user.discriminator], (users_err, result, fields) => {
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
              if (err) throw new Error(err);
              // If there is no error, scrape each channel and insert the messages into the database
              else getall(channel)
              .then(messages => {
                // Handle messages here
                if (messages === "voice") console.log(`Skipped voice channel ${channel.name}!`);
                else {
                  console.log(`[TOTAL] Pulled a total of ${messages.length} messages from the "#${channel.name}" channel. Inserting into the database now.`);
                  messages.forEach(message => {
                    db.query("INSERT INTO messages VALUES(?, ?, ?, ?, ?, ?);",
                      [message.id, message.content, message.pinned,
                      Discord.SnowflakeUtil.deconstruct(message.createdTimestamp.toString(10)).date,
                      message.user_id, message.channel_id]
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
  switch (msg.content.toLowerCase()) {
    case 'rm -rf 20':
      // Clear the last 20 messages
      msg.channel.bulkDelete(20);
      console.log("Cleared 20 messages!");
      msg.channel.send("Cleared 20 messages.");
    break;
    default:
      //console.log(msg.getOwnPropertyNames());
      break;
  }
});

// This promise resolves with the bot's API token - do not log this!
client.login(process.env.BOTAPITOKEN).catch(error => {throw new Error(error);});