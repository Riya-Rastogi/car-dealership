import { count } from "drizzle-orm";
import { db, pool } from "./client.js";
import { vehicles } from "./schema.js";

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const photos = [
  photo("1503376780353-7e6692767b70"),
  photo("1552519507-da3b142c6e3d"),
  photo("1492144534655-ae79c964c9d7"),
  photo("1549317661-bd32c8ce0db2"),
  photo("1580273916550-e323be2ae537"),
  photo("1553440569-bcc63803a83d"),
  photo("1563720223185-11003d516935"),
  photo("1502877338535-766e1452684a"),
];

const catalogue = [
  ["Toyota", "Camry SE", "sedan", 2_650_000, 4, 2022],
  ["Honda", "Accord Sport", "sedan", 2_850_000, 3, 2023],
  ["Tesla", "Model 3 Long Range", "ev", 4_750_000, 2, 2024],
  ["Ford", "Mustang GT", "coupe", 3_950_000, 1, 2021],
  ["Chevrolet", "Silverado 1500", "truck", 4_250_000, 3, 2022],
  ["Jeep", "Wrangler Rubicon", "suv", 4_600_000, 2, 2023],
  ["BMW", "330i", "sedan", 4_300_000, 2, 2022],
  ["Mercedes-Benz", "C300", "sedan", 4_100_000, 1, 2021],
  ["Audi", "Q5 Premium", "suv", 4_800_000, 2, 2023],
  ["Subaru", "Outback", "suv", 3_200_000, 5, 2022],
  ["Mazda", "CX-5", "suv", 2_900_000, 4, 2021],
  ["Hyundai", "Tucson", "suv", 3_050_000, 6, 2023],
  ["Kia", "Telluride", "suv", 3_900_000, 0, 2022],
  ["Volkswagen", "Golf GTI", "hatchback", 3_100_000, 3, 2022],
  ["Honda", "Civic Type R", "hatchback", 4_500_000, 0, 2023],
  ["Nissan", "Altima", "sedan", 2_400_000, 4, 2021],
  ["Ram", "1500 Laramie", "truck", 4_700_000, 2, 2022],
  ["Ford", "F-150 XLT", "truck", 4_000_000, 3, 2021],
  ["Rivian", "R1T", "ev", 7_300_000, 1, 2023],
  ["Porsche", "911 Carrera", "coupe", 12_000_000, 0, 2023],
  ["Chevrolet", "Corvette Stingray", "coupe", 7_200_000, 1, 2022],
  ["Toyota", "RAV4 Hybrid", "suv", 3_350_000, 5, 2022],
  ["Tesla", "Model Y", "ev", 5_200_000, 2, 2023],
  ["Ford", "Bronco", "suv", 4_900_000, 1, 2023],
] as const;

const [existing] = await db.select({ total: count() }).from(vehicles);

if (Number(existing?.total ?? 0) > 0) {
  console.log("Vehicles already present; seed skipped.");
} else {
  await db.insert(vehicles).values(
    catalogue.map(([make, model, category, priceCents, quantity, year], index) => ({
      make,
      model,
      category,
      priceCents,
      quantity,
      year,
      description: `${year} ${make} ${model} — inspected, detailed, and ready for a test drive.`,
      imageUrl: photos[index % photos.length],
    })),
  );

  console.log(`Seeded ${catalogue.length} vehicles.`);
}

await pool.end();
