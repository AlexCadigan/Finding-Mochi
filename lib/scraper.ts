import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0";

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

export async function fetchShelterPage() {
  return await fetchHtml(
    "https://www.giveshelter.org/our-services/adopt?species=Cat&age=Under1yearOld",
  );
}

export async function fetchPetangoPageFromSite(siteUrl: string) {
  const html = await fetchHtml(siteUrl);
  const $ = cheerio.load(html);
  const iframeSrc = $('iframe[src*="ws.petango.com"]').attr("src");

  if (!iframeSrc) {
    throw new Error(`Could not find Petango iframe on ${siteUrl}`);
  }

  const resolvedSrc = iframeSrc.startsWith("http")
    ? iframeSrc
    : new URL(iframeSrc, siteUrl).toString();

  return await fetchHtml(resolvedSrc);
}

export async function fetchAngelsWishPage() {
  return await fetchPetangoPageFromSite("https://angelswish.org/available-animals/");
}

export async function fetchMadisonCatProjectPage() {
  return await fetchPetangoPageFromSite("https://www.madisoncatproject.org/browse-indoor");
}
