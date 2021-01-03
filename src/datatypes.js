class Guild {
  constructor(id, name, acronym, owner) {
    if (typeof(id) !== String || id.length != 18) throw new Error(`Invalid guild id ${id} for guild name ${name}.`);
    this.id = id;
    this.name = name;
    this.acronym = acronym;
    this.owner_id = owner;
  }
}

class User {
  constructor(id, un, bot, disc) {
    if (typeof(id) !== String || id.length != 18) throw new Error(`Invalid user id ${id} for username ${un}.`);
    this.id = id;
    this.username = un;
    this.bot = bot;
    this.discriminator = disc;
  }
}

class Channel {
  constructor(id, name, topic, type, guild_id) {
    if (typeof(id) !== String || id.length != 18) throw new Error(`Invalid channel id ${id} for channel ${name}.`);
    if (typeof(guild_id) !== String || guild_id.length != 18) throw new Error(`Invalid guild id ${guild_id} referenced by channel ${name}.`);
    this.id = id;
    this.name = name;
    this.topic = topic;
    this.type = type;
    this.guild_id = guild_id;
  }
}

class Message {
  constructor(id, content, pinned, cT, uid, cid) {
    this.id = id;
    this.content = content;
    this.pinned = pinned;
    this.createdTimestamp = cT;
    this.user_id = uid;
    this.channel_id = cid;
  }
}

module.exports = { Guild, User, Channel, Message }