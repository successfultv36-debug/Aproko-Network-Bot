const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
const BUTTON_LOG_CHANNEL_ID = "1478886734614757458";
const WL_CHANNEL_ID = "1468274725821353985";
const WL_LOG_CHANNEL_ID = "1478870142329815070";
const SERVER_RULES = "1468274606707183656";

// Unverified Role ID
const UNVERIFIED_ROLE_ID = "1468265641550020618"; // example

/* ========================================== */

let invites = new Map();

/* ================= READY ================= */

client.once("clientReady", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
        try {
            const fetchedInvites = await guild.invites.fetch();
            invites.set(guild.id, fetchedInvites);
        } catch (err) {
            console.log(`⚠ Could not fetch invites for ${guild.name}`);
        }
    }

    const guild = client.guilds.cache.first();
    await guild.commands.create({
        name: "verify",
        description: "Verify an unverified user and give Citizen role",
        options: [
            {
                name: "user",
                description: "User to verify",
                type: 6, // USER
                required: true
            }
        ]
    });
    await guild.commands.create({
        name: "announcewl",
        description: "Announce sarcastic WL process to unverified members"
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

client.on("guildMemberAdd", async member => {
    let inviterTag = "Unknown";
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invites.get(member.guild.id);
        const usedInvite = newInvites.find(inv =>
            oldInvites && oldInvites.get(inv.code)?.uses < inv.uses
        );
        if (usedInvite && usedInvite.inviter) inviterTag = usedInvite.inviter.tag;
        invites.set(member.guild.id, newInvites);
    } catch { console.log("Invite detection failed."); }

    const channel = member.guild.channels.cache.find(ch => ch.name === WELCOME_CHANNEL_NAME);
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

1️⃣ Read the <#${SERVER_RULES}> and accept them  
2️⃣ Go to the whitelist channel <#${WL_CHANNEL_ID}> and type \`WL\`  
3️⃣ Wait for staff verification  

You will receive the Citizen role and full access.`
        )
        .setFooter({ text: `Member #${member.guild.memberCount}` })
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

/* ================= MEMBER LEAVE ================= */

/* ================= MEMBER LEAVE ================= */

client.on("guildMemberRemove", async (member) => {
    try {
        // Fetch the channel directly
        const channel = await member.guild.channels.fetch(DEPARTURE_CHANNEL_ID);
        if (!channel) return console.log("Departure channel not found.");

        const embed = new EmbedBuilder()
            .setColor("#ff2e2e")
            .setTitle("👋 A Citizen Has Left")
            .setDescription(
`${member.user.tag} has left the city.  
We currently have **${member.guild.memberCount}** members left.`
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.log("Failed to send departure message:", err);
    }
});

/* ================= INTERACTIONS (SLASH & BUTTON) ================= */

client.on("interactionCreate", async interaction => {

    // ===== Slash Commands =====
    if (interaction.isChatInputCommand()) {

        const staffMember = interaction.member;
        const hasPermission = staffMember.roles.cache.some(role =>
            WL_STAFF_ROLE_IDS.includes(role.id)
        );

        // ----- /verify -----
        if (interaction.commandName === "verify") {

            if (!hasPermission) {
                return interaction.reply({ content: "❌ You do not have permission.", ephemeral: true });
            }

            if (interaction.channel.id !== WL_CHANNEL_ID) {
                return interaction.reply({ content: "❌ This command can only be used in the whitelist channel.", ephemeral: true });
            }

            const targetUser = interaction.options.getUser("user");
            const targetMember = interaction.guild.members.cache.get(targetUser.id);

            if (!targetMember) return interaction.reply({ content: "User not found.", ephemeral: true });

            const citizenRole = interaction.guild.roles.cache.get(CITIZEN_ROLE_ID);
            if (!citizenRole) return interaction.reply({ content: "Citizen role not found.", ephemeral: true });

            // Prevent double verify
            if (targetMember.roles.cache.has(CITIZEN_ROLE_ID)) {
                return interaction.reply({ content: "⚠ This user is already whitelisted.", ephemeral: true });
            }

            // Give Citizen role
            await targetMember.roles.add(citizenRole);

            // Remove Unverified role if exists
            const unverifiedRole = interaction.guild.roles.cache.get(UNVERIFIED_ROLE_ID);
            if (unverifiedRole && targetMember.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                await targetMember.roles.remove(unverifiedRole);
            }

            // React to user's WL message
            try {
                const messages = await interaction.channel.messages.fetch({ limit: 30 });
                const wlMessage = messages.find(msg =>
                    msg.author.id === targetUser.id &&
                    msg.content.toLowerCase().trim() === "wl"
                );
                if (wlMessage) await wlMessage.react("✅");
            } catch {}

            // Confirmation
            await interaction.reply({ content: `🎉 ${targetUser} You are now a Citizen of Aproko Network!`, ephemeral: false });

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
        }

        // ----- /announcewl -----
        if (interaction.commandName === "announcewl") {

            if (!hasPermission) {
                return interaction.reply({ content: "❌ You do not have permission.", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: false });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("wl_reminder")
                    .setLabel("I'm Ready")
                    .setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setColor("#ff9900")
                .setTitle("🚨 Attention Unverified Citizens!")
                .setDescription(
`Hey there, <@&${UNVERIFIED_ROLE_ID}> — yes, **you**, still wandering like lost NPCs.  

Whitelist is now **shockingly easy**:  
1️⃣ Go to <#${WL_CHANNEL_ID}> and type \`WL\`  
2️⃣ Wait for a staff member to react ✅  

Citizen role granted instantly! Explore Aproko Network and start your stories.`
                )
                .setFooter({ text: "Aproko Network | Too easy to get in now" })
                .setTimestamp();

            await interaction.editReply({
                content: `<@&${UNVERIFIED_ROLE_ID}>`,
                embeds: [embed],
                components: [row]
            });

        }
    }

    // ===== Button Interactions =====
    if (interaction.isButton() && interaction.customId === "wl_reminder") {
        try {
            await interaction.reply({ content: `👍 Got it! Remember: go to #whitelist-access and type WL to get verified.`, ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(BUTTON_LOG_CHANNEL_ID);
            if (logChannel) {
                logChannel.send({
                    content: `📝 **Button Click Logged:** ${interaction.user.tag} clicked "I'm Ready" at <t:${Math.floor(Date.now() / 1000)}:F>`
                });
            }
        } catch (err) { console.log("Button interaction failed:", err); }
    }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
