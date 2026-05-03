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
import { sendDiscordAlert, sendDiscordAvailabilityAlert } from "@/lib/notifier";

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
  const kittenExternalIds = kittens
    .map(
      (kitten) =>
        kitten.external_id ?? `${kitten.source}:${kitten.url || kitten.name}`,
    )
    .filter(Boolean) as string[];

  const { data: existingAnimals } =
    kittenExternalIds.length > 0
      ? await supabase
          .from("animals")
          .select("id, external_id, availability_label")
          .in("external_id", kittenExternalIds)
      : { data: [] };

  const existingByExternalId = new Map(
    (existingAnimals ?? []).map((animal) => [animal.external_id, animal]),
  );

  await supabase.from("animals").upsert(
    kittens.map((kitten) => ({
      external_id:
        kitten.external_id ?? `${kitten.source}:${kitten.url || kitten.name}`,
      name: kitten.name,
      age_text: kitten.ageText,
      age_months: kitten.ageMonths,
      species: "cat",
      url: kitten.url,
      source: kitten.source,
      source_url: kitten.source_url,
      availability_label: kitten.availabilityLabel,
      last_seen: new Date(),
    })),
    { onConflict: "external_id" },
  );

  const { data: existingAlerts } = await supabase
    .from("alerts_sent")
    .select("animal_id, alert_type");

  const sentNewKitten = new Set<number>();
  const sentAvailability = new Set<number>();

  for (const row of existingAlerts ?? []) {
    if (!row.alert_type || row.alert_type === "new_kitten") {
      sentNewKitten.add(row.animal_id);
    }

    if (row.alert_type === "available_for_visit") {
      sentAvailability.add(row.animal_id);
    }
  }

  const { data: dbAnimals } =
    kittenExternalIds.length > 0
      ? await supabase
          .from("animals")
          .select("*")
          .in("external_id", kittenExternalIds)
      : { data: [] };

  for (const kitten of dbAnimals ?? []) {
    const previous = existingByExternalId.get(kitten.external_id);
    const wasUnavailable = Boolean(previous?.availability_label);
    const isNowAvailable = !kitten.availability_label;

    if (!sentNewKitten.has(kitten.id)) {
      await sendDiscordAlert(kitten);
      await supabase.from("alerts_sent").insert({
        animal_id: kitten.id,
        alert_type: "new_kitten",
      });
    }

    if (wasUnavailable && isNowAvailable && !sentAvailability.has(kitten.id)) {
      await sendDiscordAvailabilityAlert(
        kitten,
        previous?.availability_label ?? null,
      );
      await supabase.from("alerts_sent").insert({
        animal_id: kitten.id,
        alert_type: "available_for_visit",
      });
    }
  }

  return Response.json({
    success: true,
    found: kittens.length,
  });
}
