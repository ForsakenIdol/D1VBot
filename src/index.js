const { Message } = require("discord.js");
const { Discord, dotenv, path } = require("./utils");

dotenv.config({path: path.join(__dirname + "/../config.env")});
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Configure stuff here!
});

client.on('message', msg => {
  if (msg.content.toLowerCase() == 'oi d1v') msg.channel.send("Oi what");
});

client.login(process.env.BOTAPITOKEN);