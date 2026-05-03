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

  const ageLine =
    lines.find((l) => /\d+\s*(month|months|year|years|week|weeks)/i.test(l)) ??
    "";
  const ageIndex = lines.findIndex((l) => l === ageLine);

  const availabilityLabel =
    ageIndex > 1 &&
    !/\b(male|female|unknown)\b/i.test(lines[1]) &&
    !lines[1].includes("|")
      ? lines[1]
      : null;

  const gender = ageLine.includes("|") ? ageLine.split("|")[0].trim() : null;
  const ageMonths = parseAgeToMonths(ageLine);

  const breed =
    lines.find(
      (l) =>
        l !== name &&
        l !== ageLine &&
        l !== availabilityLabel &&
        !l.toLowerCase().includes("unavailable") &&
        !/\d+\s*(month|months|year|years|week|weeks)/i.test(l),
    ) ?? null;

  return {
    name,
    gender,
    ageText: ageLine || null,
    ageMonths,
    breed,
    availabilityLabel,
  };
}

export function parsePetangoAnimals(
  html: string,
  source: string,
  source_url: string,
) {
  const $ = cheerio.load(html);
  const animals: any[] = [];

  $(".list-item").each((_, el) => {
    const element = $(el);
    const name = element.find(".list-animal-name").text().trim() || null;
    const species = element.find(".list-animal-species").text().trim() || null;
    const gender = element.find(".list-animal-sexSN").text().trim() || null;
    const breed = element.find(".list-animal-breed").text().trim() || null;
    const ageText = element.find(".list-animal-age").text().trim() || null;
    const href = element.find(".list-animal-name a").attr("href") || "";
    const detailMatch = href.match(/poptastic\('([^']+)'\)/);
    const detailPath = detailMatch?.[1] ?? href;
    const url = detailPath
      ? detailPath.startsWith("http")
        ? detailPath
        : new URL(
            detailPath,
            "https://ws.petango.com/webservices/adoptablesearch/",
          ).toString()
      : null;

    const idMatch = href.match(/id=(\d+)/);
    const externalId = idMatch
      ? `${source}:${idMatch[1]}`
      : `${source}:${name}`;

    animals.push({
      name,
      species,
      gender,
      breed,
      ageText,
      url,
      source,
      source_url,
      external_id: externalId,
    });
  });

  return animals;
}

export function parseAgeToMonths(ageText: string): number | null {
  const lower = ageText.toLowerCase();
  const matches = [
    ...lower.matchAll(/(\d+)\s*(year|years|month|months|week|weeks)/gi),
  ];

  if (!matches.length) {
    return null;
  }

  let months = 0;

  for (const match of matches) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith("year")) {
      months += value * 12;
    } else if (unit.startsWith("week")) {
      months += Math.ceil(value / 4);
    } else {
      months += value;
    }
  }

  return months;
}
