# D1VBot
A Discord bot that is totally not for D1V. Go figure.

## Pointers
- The user ID field in the `messages` table does not make a foreign key reference to the `users` table. This is because the `users` table only stores references to users who are currently in the server, and a message can be sent by a user who subsequently leaves the server.
- *"Could not find user ${username} to ping. If this username does not consist of only alphanumeric charcters (lowercase a-z, uppercase A-Z, numbers 0-9 only) or standard keyboard symbols, the database cannot store the username. If you want this command to work on your username, ensure that it only consists of the character sets described above."*
- If a user has not sent any messages, their user ID will not show up in the list. Use this to check if a user is queried who has not sent any messages.

## Common Database Queries

The backend database makes no discrimination around the context of a query. Here are some common queries that are super useful.

- `SELECT CONCAT(users.username, '#', users.discriminator) AS Username, users.id AS 'User ID', COUNT(messages.id) AS 'num_msg_all' FROM users JOIN messages ON messages.user_id = users.id GROUP BY users.id ORDER BY COUNT(messages.id) DESC;`  
Orders users by the number of messages they have sent in **all** channels; exposes the username and unique user ID. Includes deleted messages. Does not include users who have not sent any messages.

- `SELECT CONCAT(users.username, '#', users.discriminator) AS Username, users.id AS 'User ID', COUNT(messages.id) AS 'num_msg_count' FROM users JOIN messages ON messages.user_id = users.id WHERE messages.deleted = 0 GROUP BY users.id ORDER BY COUNT(messages.id) DESC;`
Orders users by the number of messages they have sent in **all** channels; exposes the username and unique user ID. Does not include deleted messages. Does not include users who have not sent any messages.

- `SELECT CONCAT(users.username, '#', users.discriminator) AS Username, users.id AS 'User ID', messages.content FROM users JOIN messages ON messages.user_id = users.id WHERE messages.deleted = 0 AND users.id = '309501599313821708';`
Selects all of my messages (ForsakenIdol)

- `SELECT messages.id AS 'Message ID', messages.content, users.id AS 'User ID', CONCAT(users.username, '#', users.discriminator) AS 'Username', channels.name AS 'Channel' FROM users JOIN messages JOIN channels ON users.id = messages.user_id AND messages.channel_id = channels.id LIMIT 10;`
Performs a `JOIN` on 3 different tables.

- `SELECT user_id, guild_id, channel_id, COUNT(*) AS num_messages_all, COUNT(IF(messages.deleted = 1, NULL, 0)) AS num_messages_count FROM messages JOIN channels ON messages.channel_id = channels.id GROUP BY user_id, guild_id, channel_id ORDER BY COUNT(*) DESC;`
Replicates trigger behaviour to keep track of the number of messages users have sent per guild and per channel.