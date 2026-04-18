export async function fetchShelterPage() {
  const res = await fetch(
    "https://www.giveshelter.org/our-services/adopt?species=Cat&age=Under1yearOld",
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    },
  );

  return await res.text();
}
