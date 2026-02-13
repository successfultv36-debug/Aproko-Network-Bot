const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

const WELCOME_CHANNEL_NAME = "welcome-to-aproko";
const DEPARTURE_CHANNEL_NAME = "departures";

let invites = new Map();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
        const guildInvites = await guild.invites.fetch();
        invites.set(guild.id, guildInvites);
    }
});

// Track new invites created
client.on('inviteCreate', async invite => {
    const guildInvites = await invite.guild.invites.fetch();
    invites.set(invite.guild.id, guildInvites);
});

// MEMBER JOIN
client.on('guildMemberAdd', async (member) => {

    const newInvites = await member.guild.invites.fetch();
    const oldInvites = invites.get(member.guild.id);

    const usedInvite = newInvites.find(inv => 
        oldInvites.get(inv.code)?.uses < inv.uses
    );

    invites.set(member.guild.id, newInvites);

    const channel = member.guild.channels.cache
        .find(ch => ch.name === WELCOME_CHANNEL_NAME);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor("#00c3ff")
        .setTitle("🚀 Welcome to the City")
        .setImage("https://i.ibb.co/DfptNQSw/da643ccc-fc9b-429e-a65b-72b29b68203e.jpg")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
`Welcome ${member} to **${member.guild.name}** — a premium GTA V FiveM roleplay city.

📨 **Joined via:** ${usedInvite ? usedInvite.inviter.tag : "Unknown"}
🔑 **Invite Code:** ${usedInvite ? usedInvite.code : "Unknown"}

━━━━━━━━━━━━━━━━━━━━━━

🚗 Realistic vehicles & car marketplace  
🏙 Immersive city life & progression  
🎮 Serious RP environment  

🔓 **To unlock the server:**

1️⃣ Read #server-rules  
2️⃣ React with ✅ for Rules Accepted Role  
3️⃣ React with ✅ in #whitelist-access  

You will receive the Citizen role and full access.`
        )
        .setFooter({ text: `Member #${member.guild.memberCount}` })
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

// MEMBER LEAVE
client.on('guildMemberRemove', async (member) => {

    const channel = member.guild.channels.cache
        .find(ch => ch.name === DEPARTURE_CHANNEL_NAME);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor("#ff2e2e")
        .setTitle("👋 A Citizen Has Left")
        .setDescription(`${member.user.tag} has left the city we currently have [memberCount] members left.`)
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

client.login(process.env.TOKEN);
