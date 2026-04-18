import * as cheerio from "cheerio";

export function parseAnimals(html: string) {
  const $ = cheerio.load(html);

  const animals: any[] = [];

  $(".petCard__details").each((_, el) => {
    const raw = $(el).text();

    const parsed = parsePetBlock(raw);

    const link = $(el).closest("a").attr("href");

    animals.push({
      ...parsed,
      url: link ? `https://www.giveshelter.org${link}` : null,
    });
  });

  return animals;
}

function parsePetBlock(text: string) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const name = lines[0] ?? null;

  // 🔥 Find the line that actually contains age info
  const ageLine =
    lines.find((l) => /\d+\s*(month|months|year|years|week|weeks)/i.test(l)) ??
    "";

  // Gender is usually in the same line as age OR a separate prefix
  const gender = ageLine.includes("|") ? ageLine.split("|")[0].trim() : null;

  // Extract age safely from ANY line that contains it
  const ageMatch = ageLine.match(
    /(\d+)\s*(month|months|year|years|week|weeks)/i,
  );

  let ageMonths: number | null = null;

  if (ageMatch) {
    const value = parseInt(ageMatch[1]);
    const unit = ageMatch[2].toLowerCase();

    if (unit.startsWith("year")) ageMonths = value * 12;
    else if (unit.startsWith("week")) ageMonths = Math.ceil(value / 4);
    else ageMonths = value;
  }

  // Breed = first non-name, non-age line that isn't noise
  const breed =
    lines.find(
      (l) =>
        l !== name &&
        l !== ageLine &&
        !l.toLowerCase().includes("unavailable") &&
        !/\d+\s*(month|months|year|years|week|weeks)/i.test(l),
    ) ?? null;

  return {
    name,
    gender,
    ageText: ageLine || null,
    ageMonths,
    breed,
  };
}

export function parseAgeToMonths(ageText: string): number | null {
  const lower = ageText.toLowerCase();

  // extract number + unit anywhere in string
  const match = lower.match(/(\d+)\s*(month|months|year|years|week|weeks)/i);

  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  if (unit.startsWith("year")) {
    return value * 12;
  }

  if (unit.startsWith("week")) {
    return Math.ceil(value / 4);
  }

  return value;
}
