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
      ["messages", "users", "channels", "guilds"].forEach(table => {
        console.log(`Clearing the ${table} table!`);
        db.query(`DELETE FROM ${table};`, (err, result, fields) => {
          if (err) {console.log(err); throw new Error(`Could not delete from the ${table} table.`);}
          else console.log(`Successfully deleted from the ${table} table!`);
        });
      });

      // Once table information has been cleared, we can pull information for each guild and insert that information into the database.
      const Guilds = client.guilds.cache;
      Guilds.forEach(guild => {
        db.query("INSERT INTO guilds VALUES(?, ?, ?, ?);", [guild.id, guild.name, guild.nameAcronym, guild.ownerID], (err, result, fields) => {
          if (err) console.log(err);
          else console.log(`Successfully inserted guild ${guild.name} into the database.`);
        });
        // Scrape each channel
        console.log(`Scraping each channel in ${guild.name}...`);
        guild.channels.cache.each(channel => {
          getall(channel)
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
        })
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