export async function sendDiscordAlert(animal: any) {
  const webhook = process.env.DISCORD_WEBHOOK_URL!;
  const ageMonths = animal.ageMonths ?? animal.age_months;
  const ageText =
    animal.ageText ?? (ageMonths != null ? `${ageMonths} months` : "Unknown");
  const source = animal.source ?? "Unknown Source";
  const link = animal.url || animal.source_url || null;
  const availabilityLabel =
    animal.availabilityLabel ?? animal.availability_label ?? null;

  const message = {
    content: `🐱 **New Kitten Alert!**

**Name:** ${animal.name}
${
  availabilityLabel
    ? `**Status:** ${availabilityLabel}
`
    : ""
}**Age:** ${ageText}
**Source:** ${source}
${link ? `🔗 ${link}` : ""}`.trim(),
  };

  await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

export async function sendDiscordAvailabilityAlert(
  animal: any,
  previousAvailabilityLabel: string | null = null,
) {
  const webhook = process.env.DISCORD_WEBHOOK_URL!;
  const ageMonths = animal.ageMonths ?? animal.age_months;
  const ageText =
    animal.ageText ?? (ageMonths != null ? `${ageMonths} months` : "Unknown");
  const source = animal.source ?? "Unknown Source";
  const link = animal.url || animal.source_url || null;

  const message = {
    content: `🐾 **Kitten Now Available for Visit!**

**Name:** ${animal.name}
${
  previousAvailabilityLabel
    ? `**Previously:** ${previousAvailabilityLabel}
`
    : ""
}**Age:** ${ageText}
**Source:** ${source}
${link ? `🔗 ${link}` : ""}`.trim(),
  };

  await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
