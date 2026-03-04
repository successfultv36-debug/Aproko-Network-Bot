const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ================= CONFIG ================= */

// Staff Role IDs
const WL_STAFF_ROLE_IDS = [
    "1468265338453098630",
    "1468263230290792651",
    "1468271872926945516",
    "1471999350686351663",
    "1468265563947139196"
];

// Citizen Role ID
const CITIZEN_ROLE_ID = "1468806482228412699";

// Channels
const WELCOME_CHANNEL_NAME = "welcome-to-aproko";
const DEPARTURE_CHANNEL_ID = "1468685129655390274";

const WL_CHANNEL_ID = "1468274725821353985";
const WL_LOG_CHANNEL_ID = "1478870142329815070";

/* ========================================== */

let invites = new Map();

/* ================= READY ================= */

client.once("clientReady", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Cache invites safely
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const fetchedInvites = await guild.invites.fetch();
            invites.set(guildId, fetchedInvites);
        } catch (err) {
            console.log(`⚠ Could not fetch invites for ${guild.name}`);
        }
    }

    // Register slash command
    const guild = client.guilds.cache.first();

    await guild.commands.create({
        name: "verify",
        description: "Verify a UnVerified user and give Citizen role",
        options: [
            {
                name: "user",
                description: "User to verify",
                type: 6,
                required: true
            }
        ]
    });
});

/* ================= INVITE TRACKER ================= */

client.on("inviteCreate", async invite => {
    try {
        const guildInvites = await invite.guild.invites.fetch();
        invites.set(invite.guild.id, guildInvites);
    } catch {}
});

/* ================= MEMBER JOIN ================= */

client.on("guildMemberAdd", async (member) => {

    let inviterTag = "Unknown";

    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invites.get(member.guild.id);

        const usedInvite = newInvites.find(inv =>
            oldInvites && oldInvites.get(inv.code)?.uses < inv.uses
        );

        if (usedInvite && usedInvite.inviter) {
            inviterTag = usedInvite.inviter.tag;
        }

        invites.set(member.guild.id, newInvites);

    } catch {
        console.log("Invite detection failed.");
    }

    const channel = member.guild.channels.cache.find(
        ch => ch.name === WELCOME_CHANNEL_NAME
    );

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor("#00c3ff")
        .setTitle("🚀 Welcome to Aproko Network")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage("https://i.ibb.co/DfptNQSw/da643ccc-fc9b-429e-a65b-72b29b68203e.jpg")
        .setDescription(
`Welcome ${member} to **${member.guild.name}** — a premium GTA V FiveM roleplay city.

📨 **Invited By:** ${inviterTag}

━━━━━━━━━━━━━━━━━━━━━━

🚗 Realistic vehicles & marketplace  
🏙 Immersive city progression  
🎮 Serious RP environment  

🔓 **To Get Whitelisted:**

1️⃣ Read the https://discord.com/channels/1468263078109118633/1468274606707183656 and accept them  
2️⃣ Go to the https://discord.com/channels/1468263078109118633/1468274725821353985 channel and type \`WL\`  
3️⃣ Wait for staff verification  

You will receive the Citizen role and full access.`
        )
        .setFooter({ text: `Member #${member.guild.memberCount}` })
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

/* ================= MEMBER LEAVE ================= */

client.on("guildMemberRemove", async (member) => {

    const channel = member.guild.channels.cache.get(DEPARTURE_CHANNEL_ID);

    if (!channel) {
        console.log("Departure channel not found.");
        return;
    }

    const embed = new EmbedBuilder()
        .setColor("#ff2e2e")
        .setTitle("👋 A Citizen Has Left")
        .setDescription(
`${member.user.tag} has left the city.

We now have **${member.guild.memberCount}** members remaining.`
        )
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

/* ================= WHITELIST VERIFY SYSTEM ================= */

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "verify") return;

    // Restrict to WL channel
    if (interaction.channel.id !== WL_CHANNEL_ID) {
        return interaction.reply({
            content: "❌ This command can only be used in the whitelist channel.",
            ephemeral: true
        });
    }

    const staffMember = interaction.member;

    // Check role IDs
    const hasPermission = staffMember.roles.cache.some(role =>
        WL_STAFF_ROLE_IDS.includes(role.id)
    );

    if (!hasPermission) {
        return interaction.reply({
            content: "❌ You do not have permission to use this command.",
            ephemeral: true
        });
    }

    const targetUser = interaction.options.getUser("user");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    if (!targetMember) {
        return interaction.reply({
            content: "User not found.",
            ephemeral: true
        });
    }

    const citizenRole = interaction.guild.roles.cache.get(CITIZEN_ROLE_ID);

    if (!citizenRole) {
        return interaction.reply({
            content: "Citizen role not found.",
            ephemeral: true
        });
    }

    // Prevent double verify
    if (targetMember.roles.cache.has(CITIZEN_ROLE_ID)) {
        return interaction.reply({
            content: "⚠ This user is already whitelisted.",
            ephemeral: true
        });
    }

    // Give role
    await targetMember.roles.add(citizenRole);

    // React to WL message
    try {
        const messages = await interaction.channel.messages.fetch({ limit: 30 });

        const wlMessage = messages.find(msg =>
            msg.author.id === targetUser.id &&
            msg.content.toLowerCase().trim() === "wl"
        );

        if (wlMessage) {
            await wlMessage.react("✅");
        }
    } catch {}

    // Public confirmation
    await interaction.reply({
        content: `🎉 ${targetUser} You are now a Citizen of Aproko Network, you can use the connect channel to fly in now.`,
        ephemeral: false
    });

    // Log verification
    const logChannel = interaction.guild.channels.cache.get(WL_LOG_CHANNEL_ID);

    if (logChannel) {
        logChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("#00c3ff")
                    .setTitle("Whitelist Verification Log")
                    .setDescription(
`👤 **User:** ${targetUser.tag}
🛡 **Verified By:** ${interaction.user.tag}
🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    )
                    .setTimestamp()
            ]
        });
    }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
