require("dotenv").config();

const express = require("express");
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

// ======================
// WEB SERVER (Render Pflicht)
// ======================
const app = express();

app.get("/", (req, res) => {
    res.send("Bot läuft");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Webserver läuft auf Port " + PORT);
});

// ======================
// CONFIG
// ======================
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

const CLIENT_ID = "1509566143051071578";
const STAFF_ROLE_ID = "1508899899222134835";

const ROLE_IDS = [
    "1508899625258717355",
    "1507456888843800596"
];

const LOG_CHANNEL_ID = "1507456889615810642";

const claimedTickets = new Map();

// ======================
// DISCORD BOT
// ======================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ======================
// SLASH COMMAND
// ======================
const commands = [
    new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Erstellt das Ticket Panel')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("✅ Slash Commands registriert.");

    } catch (error) {
        console.error(error);
    }
})();

// ======================
// READY EVENT (BEIDE ZUSAMMENGEFÜGT)
// ======================
client.once("clientReady", () => {
    console.log("Bot online: " + client.user.tag);
});

client.once(Events.ClientReady, () => {
    console.log(`✅ ${client.user.tag} ist online.`);
});

// ======================
// JOIN EVENT (AUTO ROLE + LOG)
// ======================
client.on("guildMemberAdd", async (member) => {

    // ===== AUTO ROLES =====
    for (const roleId of ROLE_IDS) {
        const role = member.guild.roles.cache.get(roleId);

        if (role) {
            member.roles.add(role).catch(console.error);
        }
    }

    // ===== LOG CHANNEL =====
    const logChannel = await member.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle("⚡️ Logging ⚡️")
        .setDescription(
            `<@${member.id}> ist gejoined!\n\n` +
            `UserId: ${member.id}\n\n` +
            `Aktuelle Memberanzahl: ${member.guild.memberCount}`
        )
        .setColor(0x00ffcc)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setFooter({ text: "powered by FARM" })
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
});

// ======================
// INTERACTIONS (TICKET SYSTEM KOMPLETT UNVERÄNDERT)
// ======================
client.on(Events.InteractionCreate, async interaction => {

    // ====================================
    // /ticketpanel
    // ====================================

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'ticketpanel') {

            const embed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle('🎫 Allgemeiner Support')
                .setDescription(`
Du hast ein Problem, eine Frage oder benötigst Hilfe auf dem Server? Dann bist du hier genau richtig!

Erstelle ein Ticket und beschreibe dein Anliegen so genau wie möglich, damit wir dir schnell und effektiv helfen können.

━━━━━━━━━━━━━━━━━━

📌 **Wobei wir dir helfen können:**

• Fragen zum Server
• Probleme / Bugs
• Spieler melden
• Allgemeine Hilfe
• Sonstige Anliegen

━━━━━━━━━━━━━━━━━━

👥 **Bewerbungen & Allgemeiner Support**

Du möchtest dich bewerben oder Allgemeinen Support erhalten?
Dann wähle unten die passende Kategorie aus.

━━━━━━━━━━━━━━━━━━
                `)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({
                    text: 'FARMMC.de Support System'
                });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('ticket_menu')
                .setPlaceholder('Wähle eine Kategorie aus um ein Ticket zu öffnen')
                .addOptions([
                    {
                        label: 'Clan Bewerbung',
                        description: 'Bewirb dich für unseren Clan',
                        emoji: '🛡',
                        value: 'clan_bewerbung'
                    },
                    {
                        label: 'Team Bewerbung',
                        description: 'Bewirb dich für das Team',
                        emoji: '👥',
                        value: 'team_bewerbung'
                    },
                    {
                        label: 'Allgemeiner Support',
                        description: 'Bug / Report / usw.',
                        emoji: '🏗',
                        value: 'allgemeiner_support'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);

            await interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    // ====================================
    // DROPDOWN MENÜ
    // ====================================

    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'ticket_menu') {

            const selected = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal_${selected}`)
                .setTitle('Ticket Informationen');

            const mcName = new TextInputBuilder()
                .setCustomId('mc_name')
                .setLabel('Minecraft Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const problem = new TextInputBuilder()
                .setCustomId('problem')
                .setLabel('Anliegen / Problem')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const when = new TextInputBuilder()
                .setCustomId('when')
                .setLabel('Wann ist das Problem aufgetreten?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const extra = new TextInputBuilder()
                .setCustomId('extra')
                .setLabel('Zusätzliche Informationen')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(mcName),
                new ActionRowBuilder().addComponents(problem),
                new ActionRowBuilder().addComponents(when),
                new ActionRowBuilder().addComponents(extra)
            );

            await interaction.showModal(modal);
        }
    }

    // ====================================
    // MODAL SUBMIT
    // ====================================

    if (interaction.isModalSubmit()) {

        // ===== TICKET ERSTELLEN =====
        if (interaction.customId.startsWith('ticket_modal_')) {

            const selected = interaction.customId.replace('ticket_modal_', '');

            let ticketName = "";
            let ticketTitle = "";

            if (selected === "clan_bewerbung") {
                ticketName = `clan-${interaction.user.username}`;
                ticketTitle = "🛡 Clan Bewerbung";
            }

            if (selected === "team_bewerbung") {
                ticketName = `team-${interaction.user.username}`;
                ticketTitle = "👥 Team Bewerbung";
            }

            if (selected === "bau_firma") {
                ticketName = `bau-${interaction.user.username}`;
                ticketTitle = "🏗 Bau Firma";
            }

            const existing = interaction.guild.channels.cache.find(
                c => c.name === ticketName.toLowerCase()
            );

            if (existing) {
                return interaction.reply({
                    content: `❌ Du hast bereits ein Ticket offen: ${existing}`,
                    ephemeral: true
                });
            }

            const mcName = interaction.fields.getTextInputValue('mc_name');
            const problem = interaction.fields.getTextInputValue('problem');
            const when = interaction.fields.getTextInputValue('when');
            const extra = interaction.fields.getTextInputValue('extra') || '...';

            const channel = await interaction.guild.channels.create({
                name: ticketName,
                type: ChannelType.GuildText,

                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id: STAFF_ROLE_ID,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    }
                ]
            });

            const claimButton = new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Ticket übernehmen')
                .setEmoji('📌')
                .setStyle(ButtonStyle.Primary);

            const addUserButton = new ButtonBuilder()
                .setCustomId('add_user')
                .setLabel('Spieler hinzufügen')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Secondary);

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger);

            const buttonRow = new ActionRowBuilder()
                .addComponents(claimButton, addUserButton, closeButton);

            const ticketEmbed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle(ticketTitle)
                .setDescription(`
👤 Erstellt von: ${interaction.user}

━━━━━━━━━━━━━━━━━━

🎮 Minecraft Name:
\`${mcName}\`

❓ Anliegen / Problem:
${problem}

📅 Wann ist das Problem aufgetreten?
${when}

📎 Zusätzliche Informationen:
${extra}
                `)
                .setFooter({
                    text: 'FARMMC.de Ticket System'
                })
                .setTimestamp();

            await channel.send({
                content: `<@&${STAFF_ROLE_ID}>`,
                embeds: [ticketEmbed],
                components: [buttonRow]
            });

            await interaction.reply({
                content: `✅ Dein Ticket wurde erstellt: ${channel}`,
                ephemeral: true
            });
        }

        // ===== USER HINZUFÜGEN =====
        if (interaction.customId === 'add_user_modal') {

            const userId = interaction.fields.getTextInputValue('user_id');

            try {
                const member = await interaction.guild.members.fetch(userId);

                await interaction.channel.permissionOverwrites.edit(member.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                await interaction.reply({
                    content: `✅ ${member} wurde hinzugefügt.`,
                    ephemeral: false
                });

            } catch {
                await interaction.reply({
                    content: '❌ User nicht gefunden.',
                    ephemeral: true
                });
            }
        }
    }

    // ====================================
    // BUTTONS
    // ====================================

    if (interaction.isButton()) {

        if (interaction.customId === 'claim_ticket') {

            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({
                    content: '❌ Nur Teammitglieder können Tickets übernehmen.',
                    ephemeral: true
                });
            }

            claimedTickets.set(interaction.channel.id, interaction.user.id);

            await interaction.channel.permissionOverwrites.edit(STAFF_ROLE_ID, {
                ViewChannel: true,
                SendMessages: false,
                ReadMessageHistory: true
            });

            await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const claimedButton = new ButtonBuilder()
                .setCustomId('claimed_ticket')
                .setLabel(`Übernommen von ${interaction.user.username}`)
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true);

            const addUserButton = new ButtonBuilder()
                .setCustomId('add_user')
                .setLabel('Spieler hinzufügen')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Secondary);

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger);

            const newRow = new ActionRowBuilder()
                .addComponents(claimedButton, addUserButton, closeButton);

            await interaction.message.edit({
                components: [newRow]
            });

            const claimEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription(`
📌 Der Teamler ${interaction.user} hat das Ticket übernommen.

Er wird sich zeitnah um dich kümmern!
                `)
                .setTimestamp();

            await interaction.reply({
                embeds: [claimEmbed]
            });
        }

        if (interaction.customId === 'add_user') {

            const modal = new ModalBuilder()
                .setCustomId('add_user_modal')
                .setTitle('Spieler hinzufügen');

            const userInput = new TextInputBuilder()
                .setCustomId('user_id')
                .setLabel('Discord User ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(userInput)
            );

            await interaction.showModal(modal);
        }

        if (interaction.customId === 'close_ticket') {

            await interaction.reply({
                content: '🔒 Ticket wird in 3 Sekunden geschlossen...',
                ephemeral: false
            });

            setTimeout(() => {
                interaction.channel.delete().catch(console.error);
            }, 3000);
        }
    }
});

// ======================
// LOGIN (NUR EINMAL)
// ======================
client.login(TOKEN);