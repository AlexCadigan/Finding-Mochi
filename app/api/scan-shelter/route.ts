import { fetchShelterPage } from "@/lib/scraper";
import { parseAnimals, parseAgeToMonths } from "@/lib/parser";
import { isYoungKitten } from "@/lib/filters";
import { supabase } from "@/lib/supabase";
import { sendDiscordAlert } from "@/lib/notifier";

export async function GET() {
  const html = await fetchShelterPage();

  const animals = parseAnimals(html);

  const enriched = animals.map((a) => ({
    ...a,
    ageMonths: parseAgeToMonths(a.ageText),
  }));

  const kittens = enriched.filter(isYoungKitten);

  // Upsert into DB
  await supabase.from("animals").upsert(
    kittens.map((k) => ({
      external_id: k.url || k.name,
      name: k.name,
      age_text: k.ageText,
      age_months: k.ageMonths,
      species: "cat",
      url: k.url,
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
