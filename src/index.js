const { Discord, path, getall } = require("./utils");

const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Configure stuff here!
  const Guilds = client.guilds.cache;
  let guild_id, guild_name, guild_channels;
  [guild_id, guild_name, guild_channels] = Guilds.map(guild => [guild.id, guild.name, guild.channels.cache])[0];
  console.log(guild_channels.size); // There are 2 hidden channels in Aesthetics.

  // Scrape each channel
  console.log("Scraping each channel in Aesthetics...");
  guild_channels.each(channel => {
    getall(channel, 500)
    .then(messages => {messages === null ? console.log(`Skipped voice channel ${channel.name}!`) : console.log(`[TOTAL] Pulled a total of ${messages.length} messages from the "${channel.name}" channel.`);})
    .catch(error => {console.log(`\nError while fetching from ${channel.name}!`); console.log(error);});
  });

});

client.on('message', msg => {
  switch (msg.content.toLowerCase()) {
    case '--listall -l 300 --force':
      // Embedded messages are empty and have a length of 0.
      console.log("Getting messages\n");
      getall(msg.channel, 300).then(messages => {
        console.log(messages.length);
      }).catch(error => {console.log("Error in fetching."); console.log(error);});

      break;
    case 'rm -rf 20':
      // Clear the last 20 messages
      msg.channel.bulkDelete(20);
      console.log("Cleared 20 messages!");
      msg.channel.send("Cleared 20 messages. Don't try me bitch.");
    break;
    case 'yo d1vbot, you give a fuck?':
      msg.channel.send("Take a guess (hint: not at all)");
      break;
    default:
      break;
  }
});

client.login(process.env.BOTAPITOKEN);
