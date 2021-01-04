# D1VBot
A Discord bot that is totally not for D1V. Go figure.

## Pointers
- The user ID field in the `messages` table does not make a foreign key reference to the `users` table. This is because the `users` table only stores references to users who are currently in the server, and a message can be sent by a user who subsequently leaves the server.
- *"Could not find user ${username} to ping. If this username does not consist of only alphanumeric charcters (lowercase a-z, uppercase A-Z, numbers 0-9 only) or standard keyboard symbols, the database cannot store the username. If you want this command to work on your username, ensure that it only consists of the character sets described above."*

## Common Database Queries

The backend database makes no discrimination around the context of a query. Here are some common queries that are super useful.

- `SELECT username AS Username, users.id AS 'User ID', COUNT(messages.id) AS 'Number of Messages Sent in ALL Channels' FROM messages JOIN users ON messages.user_id = users.id GROUP BY users.id ORDER BY COUNT(messages.id) DESC;`  
Orders users by the number of messages they have sent in **all** channels; exposes the username and unique user ID.