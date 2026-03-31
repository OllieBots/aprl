const { REST, Routes, EmbedBuilder } = require('discord.js');
const db = require('../db/db');

function getToken() {
  return process.env.DISCORD_BOT_TOKEN;
}

async function getGuildId() {
  const row = await db.get('SELECT discord_guild_id FROM league WHERE id = 1');
  return row?.discord_guild_id;
}

function rest() {
  const token = getToken();
  if (!token) throw new Error('Discord bot token not configured on the server.');
  return new REST({ version: '10' }).setToken(token);
}

async function sendTestMessage() {
  const guildId = await getGuildId();
  if (!guildId) throw new Error('No Discord server configured. Enter your Server ID in Discord settings.');

  const r = rest();
  const channels = await r.get(Routes.guildChannels(guildId));
  const channel = channels.find(c => c.name === 'general' && c.type === 0);
  if (!channel) throw new Error('Could not find #general channel.');

  await r.post(Routes.channelMessages(channel.id), {
    body: { content: 'APRL bot test message — connection confirmed!' },
  });
}

async function postStandings(channelName = 'standings') {
  const guildId = await getGuildId();
  if (!guildId) throw new Error('No Discord server configured. Enter your Server ID in Discord settings.');

  const r = rest();
  const channels = await r.get(Routes.guildChannels(guildId));
  const channel = channels.find(c => c.name === channelName && c.type === 0);
  if (!channel) throw new Error(`Could not find #${channelName} channel in your Discord server.`);

  const rows = await db.all(`
    SELECT d.name, d.car_number, d.car_model,
      COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0)::int as pts,
      SUM(CASE WHEN rr.finish_position = 1 THEN 1 ELSE 0 END)::int as wins
    FROM drivers d
    LEFT JOIN race_results rr ON d.id = rr.driver_id
    WHERE d.status = 'active'
    GROUP BY d.id, d.name, d.car_number, d.car_model
    ORDER BY pts DESC
    LIMIT 20
  `);

  const league = await db.get('SELECT name FROM league WHERE id = 1');
  const season = await db.get('SELECT name FROM seasons WHERE is_active = 1 LIMIT 1');

  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((row, i) => {
    const pos = medals[i] || `**${i + 1}.**`;
    const wins = row.wins > 0 ? ` · ${row.wins}W` : '';
    return `${pos} ${row.name}${wins} — **${row.pts} pts**`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xe8302a)
    .setAuthor({ name: league?.name || 'APRL' })
    .setTitle(`📊 Season Standings — ${season?.name || 'Current Season'}`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Updated ${new Date().toUTCString()}` });

  await r.post(Routes.channelMessages(channel.id), {
    body: { embeds: [embed.toJSON()] },
  });

  await db.run("INSERT INTO activity_log (type, message) VALUES ('discord', ?)",
    `Standings posted to #${channelName}`);
}

module.exports = { sendTestMessage, postStandings };
