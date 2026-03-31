const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db/db');

let client = null;

function getConfig() {
  return db.prepare('SELECT discord_bot_token, discord_guild_id FROM league WHERE id = 1').get();
}

async function initBot() {
  const config = getConfig();
  if (!config?.discord_bot_token) return null;

  if (client) {
    try { await client.destroy(); } catch {}
  }

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('ready', () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
    db.prepare("INSERT INTO activity_log (type, message) VALUES ('discord', ?)")
      .run(`Bot connected as ${client.user.tag}`);
    registerCommands(config.discord_bot_token, config.discord_guild_id);
  });

  client.on('interactionCreate', handleInteraction);

  await client.login(config.discord_bot_token);
  return client;
}

async function registerCommands(token, guildId) {
  const commands = [
    new SlashCommandBuilder().setName('standings').setDescription('Show current season standings'),
    new SlashCommandBuilder().setName('nextrace').setDescription('Show next race info and countdown'),
    new SlashCommandBuilder()
      .setName('results')
      .setDescription('Show results for a round')
      .addIntegerOption(opt => opt.setName('round').setDescription('Round number').setRequired(false)),
    new SlashCommandBuilder()
      .setName('driver')
      .setDescription('Show driver stats')
      .addStringOption(opt => opt.setName('name').setDescription('Driver name').setRequired(false)),
    new SlashCommandBuilder()
      .setName('admin')
      .setDescription('Admin commands')
      .addSubcommand(sub =>
        sub.setName('sync').setDescription('Force sync results from iRacing')
      )
      .addSubcommand(sub =>
        sub.setName('penalize')
          .setDescription('Apply points penalty')
          .addStringOption(opt => opt.setName('driver').setDescription('Driver name').setRequired(true))
          .addIntegerOption(opt => opt.setName('points').setDescription('Points to deduct').setRequired(true))
          .addStringOption(opt => opt.setName('reason').setDescription('Reason for penalty').setRequired(true))
      ),
  ].map(cmd => cmd.toJSON());

  try {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
    console.log('Discord slash commands registered');
  } catch (err) {
    console.error('Failed to register Discord commands:', err.message);
  }
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'standings') {
    const standings = db.prepare(`
      SELECT d.name, COALESCE(SUM(rr.points_awarded + rr.points_adjustment), 0) as pts
      FROM drivers d
      LEFT JOIN race_results rr ON d.id = rr.driver_id
      WHERE d.status = 'active'
      GROUP BY d.id ORDER BY pts DESC LIMIT 10
    `).all();

    const embed = new EmbedBuilder()
      .setColor(0xe8302a)
      .setTitle('Season Standings')
      .setDescription(standings.map((s, i) => `**${i + 1}.** ${s.name} — ${s.pts} pts`).join('\n'));

    await interaction.reply({ embeds: [embed] });

  } else if (commandName === 'nextrace') {
    const now = Math.floor(Date.now() / 1000);
    const race = db.prepare("SELECT * FROM races WHERE status = 'upcoming' AND scheduled_at > ? ORDER BY scheduled_at ASC LIMIT 1").get(now);

    if (!race) {
      await interaction.reply('No upcoming races scheduled.');
      return;
    }

    const date = new Date(race.scheduled_at * 1000);
    const embed = new EmbedBuilder()
      .setColor(0xe8302a)
      .setTitle(`Next Race: Round ${race.round_number}`)
      .addFields(
        { name: 'Track', value: `${race.track_name} — ${race.track_config || ''}`, inline: true },
        { name: 'Date', value: date.toUTCString(), inline: true },
        { name: 'Laps', value: String(race.laps || 'TBD'), inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
}

async function sendTestMessage() {
  if (!client?.isReady()) throw new Error('Discord bot is not connected');
  const config = getConfig();
  const guild = await client.guilds.fetch(config.discord_guild_id);
  const channel = guild.channels.cache.find(c => c.name === 'general');
  if (!channel) throw new Error('Could not find #general channel');
  await channel.send('APRL bot test message — connection confirmed!');
}

module.exports = { initBot, sendTestMessage };
