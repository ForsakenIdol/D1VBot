CREATE DATABASE discord;
USE discord;

DROP TABLE IF EXISTS messages, users, channels, guilds;

CREATE TABLE users(
  id VARCHAR(18) PRIMARY KEY NOT NULL CHECK (CHAR_LENGTH(id) = 18),
  username VARCHAR(32),
  bot TINYINT(1) NOT NULL,
  discriminator VARCHAR(4) NOT NULL
);

CREATE TABLE guilds(
  id VARCHAR(18) PRIMARY KEY NOT NULL CHECK (CHAR_LENGTH(id) = 18),
  name TEXT,
  nameAcronym TEXT,
  owner_id VARCHAR(18),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE channels(
  id VARCHAR(18) PRIMARY KEY NOT NULL CHECK (CHAR_LENGTH(id) = 18),
  name TEXT NOT NULL,
  type ENUM('dm', 'text', 'voice', 'category', 'news', 'store', 'unknown') NOT NULL,
  guild_id VARCHAR(18),
  FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- We only store user and bot messages here, i.e. messages with a type of DEFAULT
-- We do not store system or server messages.
-- No foreign key on users here. We allow messages from users who may have already left the guild.
CREATE TABLE messages(
  id VARCHAR(18) PRIMARY KEY NOT NULL CHECK (CHAR_LENGTH(id) = 18),
  content TEXT,
  pinned TINYINT(1) NOT NULL,
  createdTimestamp DATETIME NOT NULL,
  user_id VARCHAR(18) NULL,
  channel_id VARCHAR(18) NOT NULL,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);