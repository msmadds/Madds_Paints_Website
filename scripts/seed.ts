/**
 * Seeds sample artworks, prints, delivery zones and default settings.
 * Usage: npm run db:seed
 *
 * Safe to run more than once: it only adds sample artworks when the catalogue
 * is empty. All titles, prices and images are placeholders; replace them in
 * the admin dashboard.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

config({ path: ".env.local" });
config();

type SeedArt = {
  slug: string;
  title: string;
  medium: string;
  w: number;
  h: number;
  year: number;
  price: number | null;
  status: "available" | "reserved" | "sold";
  featured: boolean;
  img: [string, number, number];
  description: string;
  prints?: { edition: "open" | "limited"; editionSize?: number; stock?: number | null };
};

const art: SeedArt[] = [
  {
    slug: "harbour-before-rain",
    title: "Harbour Before Rain",
    medium: "Acrylic on canvas",
    w: 100, h: 75, year: 2026, price: 2_400_000, status: "available", featured: true,
    img: ["/art/harbour-before-rain.jpg", 1800, 1350],
    description:
      "The harbour in the ten minutes before a storm, when the water turns heavy and the sky goes pale at the horizon. Painted in thin glazes of blue-grey over a warm ground.",
    prints: { edition: "open" },
  },
  {
    slug: "wall-at-dusk",
    title: "Wall at Dusk",
    medium: "Oil on canvas",
    w: 60, h: 80, year: 2025, price: 1_850_000, status: "sold", featured: true,
    img: ["/art/wall-at-dusk.jpg", 1350, 1800],
    description:
      "A painted wall in Upanga holding the last of the day's heat. Two shadows, one tall doorway, and the pink that only appears for a few minutes after sunset.",
    prints: { edition: "limited", editionSize: 50, stock: 42 },
  },
  {
    slug: "kariakoo-noon",
    title: "Kariakoo Noon",
    medium: "Acrylic on canvas",
    w: 90, h: 90, year: 2026, price: 2_800_000, status: "available", featured: true,
    img: ["/art/kariakoo-noon.jpg", 1600, 1600],
    description:
      "The market at midday, reduced to its colours: ochre dust, a red awning, the blue of a shaded stall and a sack of white flour catching the sun.",
    prints: { edition: "open" },
  },
  {
    slug: "msasani-tide",
    title: "Msasani Tide",
    medium: "Acrylic on canvas",
    w: 120, h: 80, year: 2025, price: 3_200_000, status: "reserved", featured: false,
    img: ["/art/msasani-tide.jpg", 1800, 1200],
    description:
      "Low tide at Msasani Bay, when the sand bar appears and the water separates into bands of green. A slow painting, built over six weeks.",
    prints: { edition: "open" },
  },
  {
    slug: "indigo-market",
    title: "Indigo Market",
    medium: "Oil on linen",
    w: 65, h: 85, year: 2024, price: 1_600_000, status: "sold", featured: false,
    img: ["/art/indigo-market.jpg", 1300, 1700],
    description:
      "Evening under a stall's blue tarpaulin, with a single lamp of saffron light. Vertical strokes follow the folds of the cloth.",
    prints: { edition: "open" },
  },
  {
    slug: "salt-light",
    title: "Salt Light",
    medium: "Acrylic and marble dust on canvas",
    w: 80, h: 80, year: 2026, price: 2_100_000, status: "available", featured: true,
    img: ["/art/salt-light.jpg", 1500, 1500],
    description:
      "The glare off the salt pans south of the city: nearly white, with one grey line of horizon. Marble dust in the paint gives the surface a quiet grain.",
  },
  {
    slug: "baobab-hour",
    title: "Baobab Hour",
    medium: "Oil on canvas",
    w: 100, h: 75, year: 2025, price: 2_600_000, status: "available", featured: true,
    img: ["/art/baobab-hour.jpg", 1800, 1350],
    description:
      "A single baobab trunk against a violet evening, painted from memory after a drive inland. Warm underlayers show through the darker ground.",
    prints: { edition: "limited", editionSize: 30, stock: 30 },
  },
  {
    slug: "upanga-afternoon",
    title: "Upanga Afternoon",
    medium: "Acrylic on canvas",
    w: 60, h: 75, year: 2024, price: null, status: "available", featured: false,
    img: ["/art/upanga-afternoon.jpg", 1350, 1700],
    description:
      "Green light through leaves onto a blue-painted gate. Part of the artist's private collection; prints are available.",
    prints: { edition: "open" },
  },
];

const printSizes = [
  { sizeLabel: "A4", widthCm: "21.0", heightCm: "29.7", price: 45_000 },
  { sizeLabel: "A3", widthCm: "29.7", heightCm: "42.0", price: 75_000 },
  { sizeLabel: "A2", widthCm: "42.0", heightCm: "59.4", price: 120_000 },
];

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL first.");
  const local = url.includes("localhost") || url.includes("127.0.0.1");
  const client = postgres(url, { max: 1, prepare: false, ssl: local ? false : "require" });
  const db = drizzle(client, { schema });

  await db.insert(schema.settings).values({ id: 1, data: {} }).onConflictDoNothing();

  const zoneCount = await db.select({ n: sql<number>`count(*)::int` }).from(schema.deliveryZones);
  if (!zoneCount[0].n) {
    await db.insert(schema.deliveryZones).values([
      { name: "Dar es Salaam delivery", fee: 10_000, estimate: "1–3 days after payment", sortOrder: 1 },
      { name: "Collect from the studio (Dar es Salaam)", fee: 0, estimate: "By appointment", sortOrder: 2 },
      { name: "Other regions in Tanzania (courier)", fee: 25_000, estimate: "3–7 days after payment", sortOrder: 3 },
      { name: "Zanzibar", fee: 0, feeToBeConfirmed: true, estimate: "We will confirm the fee by phone", sortOrder: 4 },
    ]);
    console.log("Added delivery zones.");
  }

  const artCount = await db.select({ n: sql<number>`count(*)::int` }).from(schema.artworks);
  if (artCount[0].n) {
    console.log("Artworks already exist; sample artworks skipped.");
    await client.end();
    return;
  }

  let i = 0;
  for (const a of art) {
    i++;
    const [row] = await db
      .insert(schema.artworks)
      .values({
        slug: a.slug,
        title: a.title,
        medium: a.medium,
        widthCm: String(a.w),
        heightCm: String(a.h),
        year: a.year,
        price: a.price,
        status: a.status,
        soldAt: a.status === "sold" ? new Date() : null,
        featured: a.featured,
        description: a.description,
        coaIncluded: true,
        coaNumber: `MP-COA-${a.year}-${String(i).padStart(3, "0")}`,
        sortOrder: i,
      })
      .returning();
    await db.insert(schema.artworkImages).values({
      artworkId: row.id,
      url: a.img[0],
      width: a.img[1],
      height: a.img[2],
      alt: `${a.title}, ${a.medium.toLowerCase()}, by MedePaints`,
    });
    if (a.prints) {
      const [pp] = await db
        .insert(schema.printProducts)
        .values({
          artworkId: row.id,
          paperType: "Matte fine art paper",
          paperWeightGsm: 300,
          editionType: a.prints.edition,
          editionSize: a.prints.editionSize ?? null,
          description: `A fine art print of "${a.title}", reproduced from the original painting.`,
        })
        .returning();
      await db.insert(schema.printVariants).values(
        printSizes.map((s, idx) => ({
          printProductId: pp.id,
          ...s,
          stock: a.prints!.edition === "limited" ? Math.floor((a.prints!.stock ?? 0) / 3) : null,
          sortOrder: idx,
        })),
      );
    }
  }
  console.log(`Added ${art.length} sample artworks.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
