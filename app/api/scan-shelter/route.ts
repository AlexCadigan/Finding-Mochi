import {
  fetchAngelsWishPage,
  fetchMadisonCatProjectPage,
  fetchShelterPage,
} from "@/lib/scraper";
import {
  parseAnimals,
  parseAgeToMonths,
  parsePetangoAnimals,
} from "@/lib/parser";
import { isYoungKitten } from "@/lib/filters";
import { supabase } from "@/lib/supabase";
import { sendDiscordAlert } from "@/lib/notifier";

export async function GET() {
  const [shelterHtml, angelsHtml, madisonHtml] = await Promise.all([
    fetchShelterPage(),
    fetchAngelsWishPage(),
    fetchMadisonCatProjectPage(),
  ]);

  const animals = [
    ...parseAnimals(shelterHtml).map((animal) => ({
      ...animal,
      source: "Give Shelter",
      source_url:
        "https://www.giveshelter.org/our-services/adopt?species=Cat&age=Under1yearOld",
      external_id: `Give Shelter:${animal.url || animal.name}`,
    })),
    ...parsePetangoAnimals(
      angelsHtml,
      "Angel's Wish",
      "https://angelswish.org/available-animals/",
    ),
    ...parsePetangoAnimals(
      madisonHtml,
      "Madison Cat Project",
      "https://www.madisoncatproject.org/browse-indoor",
    ),
  ];

  const enriched = animals.map((animal) => ({
    ...animal,
    ageMonths: animal.ageText ? parseAgeToMonths(animal.ageText) : null,
  }));

  const kittens = enriched.filter(isYoungKitten);

  await supabase.from("animals").upsert(
    kittens.map((kitten) => ({
      external_id: kitten.external_id ?? `${kitten.source}:${kitten.url || kitten.name}`,
      name: kitten.name,
      age_text: kitten.ageText,
      age_months: kitten.ageMonths,
      species: "cat",
      url: kitten.url,
      source: kitten.source,
      source_url: kitten.source_url,
      last_seen: new Date(),
    })),
    { onConflict: "external_id" },
  );

  const { data: existing } = await supabase
    .from("alerts_sent")
    .select("animal_id");

  const alreadySent = new Set(existing?.map((e) => e.animal_id));

  const { data: dbAnimals } = await supabase.from("animals").select("*");

  const newKittens = dbAnimals?.filter((a) => !alreadySent.has(a.id)) || [];

  for (const kitten of newKittens) {
    await sendDiscordAlert(kitten);
    await supabase.from("alerts_sent").insert({
      animal_id: kitten.id,
    });
  }

  return Response.json({
    success: true,
    found: kittens.length,
  });
}
