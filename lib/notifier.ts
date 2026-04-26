export async function sendDiscordAlert(animal: any) {
  const webhook = process.env.DISCORD_WEBHOOK_URL!;
  const ageMonths = animal.ageMonths ?? animal.age_months;
  const ageText = animal.ageText ?? (ageMonths != null ? `${ageMonths} months` : "Unknown");
  const source = animal.source ?? "Unknown Source";
  const link = animal.url || animal.source_url || null;

  const message = {
    content: `🐱 **New Kitten Alert!**

**Name:** ${animal.name}
**Age:** ${ageText}
**Source:** ${source}
${link ? `🔗 ${link}` : ""}`,
  };

  await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
