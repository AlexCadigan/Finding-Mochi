export async function sendDiscordAlert(animal: any) {
  const webhook = process.env.DISCORD_WEBHOOK_URL!;
  const ageMonths = animal.ageMonths ?? animal.age_months;
  const ageText = ageMonths != null ? `${ageMonths} months` : "Unknown";

  const message = {
    content: `🐱 **New Kitten Alert!**

**Name:** ${animal.name}
**Age:** ${ageText}
${animal.url ? `🔗 ${animal.url}` : ""}

🐾 https://www.giveshelter.org/our-services/adopt?species=Cat&age=Under1yearOld`,
  };

  await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
