import type { BotInteractionHandler } from "../types/interaction";

const handler: BotInteractionHandler = {
  type: "button",
  customId: "example:acknowledge",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    await interaction.reply({
      content: "The example button handler is working.",
      ephemeral: true,
    });
    client.logger.info(`Example button used by ${interaction.user.tag}.`);
  },
};

export default handler;
