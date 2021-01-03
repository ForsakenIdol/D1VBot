const { Discord, mysql, getall } = require("./utils");

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
    else console.log("Connected to the MySQL container!");
  });
  // Pull guild information
  const Guilds = client.guilds.cache;
  let guild_id, guild_name, guild_channels;
  [guild_id, guild_name, guild_channels] = Guilds.map(guild => [guild.id, guild.name, guild.channels.cache])[0];
  console.log(`There are ${guild_channels.size} channels altogether.\n`); // There are 2 hidden channels in Aesthetics.

  // Scrape each channel
  console.log("Scraping each channel in Aesthetics...");
  guild_channels.each(channel => {
    getall(channel)
    .then(messages => {
      // Handle messages here
      messages === null ? console.log(`Skipped voice channel ${channel.name}!`) :
                          console.log(`[TOTAL] Pulled a total of ${messages.length} messages from the "#${channel.name}" channel.`);
    })
    .catch(error => {console.log(`\nError while fetching from ${channel.name}!`); console.log(error);});
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

client.login(process.env.BOTAPITOKEN);
