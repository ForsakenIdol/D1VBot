CREATE DATABASE IF NOT EXISTS discord;
USE discord;

DROP TABLE IF EXISTS messages, users, channels, guilds;

CREATE TABLE users(
  id VARCHAR(18) PRIMARY KEY NOT NULL,
  username VARCHAR(32),
  bot TINYINT(1) NOT NULL,
  discriminator VARCHAR(4) NOT NULL
);

CREATE TABLE guilds(
  id VARCHAR(18) PRIMARY KEY NOT NULL,
  name TEXT,
  nameAcronym TEXT,
  owner_id VARCHAR(18),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE channels(
  id VARCHAR(18) PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type ENUM('text', 'voice') NOT NULL,
  guild_id VARCHAR(18),
  FOREIGN KEY (guild_id) REFERENCES guilds(id)
);

-- We only store user and bot messages here, i.e. messages with a type of DEFAULT
-- We do not store system or server messages.
CREATE TABLE messages(
  id VARCHAR(18) PRIMARY KEY NOT NULL,
  content TEXT,
  pinned TINYINT(1) NOT NULL,
  createdTimestamp DATETIME NOT NULL,
  user_id VARCHAR(18),
  channel_id VARCHAR(18) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);