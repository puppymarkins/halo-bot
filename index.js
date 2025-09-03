const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

// Tiny web server for hosting/upptime
const express = require("express");
const app = express();
app.get("/", (_, res) => res.send("Halo is alive! 🐰👼"));
app.listen(process.env.PORT || 3000, () => console.log("🌸 Web server ready"));

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
});

// Ready event
client.once("ready", () => {
  console.log(`✨ Halo is online as ꒰ঌ Halo ໒꒱!`);
});

// Slash commands
const commands = [
  // Embed creator
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create a custom embed")
    .addStringOption(o => o.setName("title").setDescription("Embed title").setRequired(false))
    .addStringOption(o => o.setName("description").setDescription("Embed description").setRequired(false))
    .addStringOption(o => o.setName("color").setDescription("Hex color, e.g. #ff99cc").setRequired(false))
    .addStringOption(o => o.setName("image").setDescription("Image URL").setRequired(false))
    .addStringOption(o => o.setName("footer").setDescription("Footer text").setRequired(false))
    .toJSON(),

  // Role button panel
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Post a role panel with toggle buttons")
    .addRoleOption(o => o.setName("role1").setDescription("First role").setRequired(true))
    .addRoleOption(o => o.setName("role2").setDescription("Second role").setRequired(true))
    .addRoleOption(o => o.setName("role3").setDescription("Third role").setRequired(false))
    .addRoleOption(o => o.setName("role4").setDescription("Fourth role").setRequired(false))
    .addRoleOption(o => o.setName("role5").setDescription("Fifth role").setRequired(false))
    .addStringOption(o => o.setName("title").setDescription("Panel title").setRequired(false))
    .addStringOption(o => o.setName("description").setDescription("Panel description").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .toJSON(),

  // Ping
  new SlashCommandBuilder().setName("ping").setDescription("Check if Halo is awake").toJSON()
];

// Register commands
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash commands registered (guild).");
}

// Handle interactions
client.on("interactionCreate", async interaction => {
  try {
    // Ping
    if (interaction.isChatInputCommand() && interaction.commandName === "ping") {
      return interaction.reply({ content: "Pong! 🐰", ephemeral: true });
    }

    // Embed command
    if (interaction.isChatInputCommand() && interaction.commandName === "embed") {
      const title = interaction.options.getString("title") || null;
      const description = interaction.options.getString("description") || null;
      const color = interaction.options.getString("color") || "#FFC0CB";
      const image = interaction.options.getString("image") || null;
      const footer = interaction.options.getString("footer") || null;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

      if (image) embed.setImage(image);
      if (footer) embed.setFooter({ text: footer });

      return interaction.reply({ embeds: [embed] });
    }

    // Panel command
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {
      const roles = [
        interaction.options.getRole("role1"),
        interaction.options.getRole("role2"),
        interaction.options.getRole("role3"),
        interaction.options.getRole("role4"),
        interaction.options.getRole("role5")
      ].filter(Boolean);

      const me = await interaction.guild.members.fetchMe();
      const unmanageable = roles.filter(r => r.position >= me.roles.highest.position);
      if (unmanageable.length) {
        const names = unmanageable.map(r => r.name).join(", ");
        return interaction.reply({ content: `⚠️ I can't manage these roles: ${names}`, ephemeral: true });
      }

      const title = interaction.options.getString("title") || "🌸 Halo’s Role Panel";
      const desc = interaction.options.getString("description") || "Click a button to toggle a role. 🐰💖";

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(roles.map((r,i)=>`${i+1}. <@&${r.id}>`).join("\n"))
        .setColor(0xFFC0CB);

      const buttons = roles.map(r => new ButtonBuilder().setCustomId(`role:${r.id}`).setLabel(r.name).setStyle(ButtonStyle.Primary));
      const row = new ActionRowBuilder().addComponents(buttons);

      const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: `Panel posted: ${msg.url}`, ephemeral: true });
    }

    // Role buttons
    if (interaction.isButton() && interaction.customId.startsWith("role:")) {
      const roleId = interaction.customId.split(":")[1];
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: "Role no longer exists.", ephemeral: true });

      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return interaction.reply({ content: `Removed **${role.name}**. 👋`, ephemeral: true });
      } else {
        await member.roles.add(role);
        return interaction.reply({ content: `Given **${role.name}**. ✨`, ephemeral: true });
      }
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable()) await interaction.reply({ content: "Something went wrong 😿", ephemeral: true });
  }
});

// Start bot
(async () => {
  try {
    await registerCommands();
    await client.login(process.env.TOKEN);
  } catch (e) {
    console.error("Startup error:", e);
  }
})();
