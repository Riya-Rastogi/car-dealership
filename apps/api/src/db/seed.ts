import { and, count, eq, like } from "drizzle-orm";
import { hashPassword } from "../lib/passwords.js";
import { db, pool } from "./client.js";
import { users, vehicles } from "./schema.js";

// Local copies of the Commons photos keep the demo fast and make sure every
// card shows the actual model. Credits live next to the files.
const photoPath = (slug: string) => `/cars/${slug}.jpg`;

const catalogue = [
  ["Toyota", "Camry SE", "sedan", 2_650_000, 4, 2022, "toyota-camry"],
  ["Honda", "Accord Sport", "sedan", 2_850_000, 3, 2023, "honda-accord"],
  ["Tesla", "Model 3 Long Range", "ev", 4_750_000, 2, 2024, "tesla-model-3"],
  ["Ford", "Mustang GT", "coupe", 3_950_000, 1, 2021, "ford-mustang"],
  ["Chevrolet", "Silverado 1500", "truck", 4_250_000, 3, 2022, "chevrolet-silverado"],
  ["Jeep", "Wrangler Rubicon", "suv", 4_600_000, 2, 2023, "jeep-wrangler"],
  ["BMW", "330i", "sedan", 4_300_000, 2, 2022, "bmw-330i"],
  ["Mercedes-Benz", "C300", "sedan", 4_100_000, 1, 2021, "mercedes-c300"],
  ["Audi", "Q5 Premium", "suv", 4_800_000, 2, 2023, "audi-q5"],
  ["Subaru", "Outback", "suv", 3_200_000, 5, 2022, "subaru-outback"],
  ["Mazda", "CX-5", "suv", 2_900_000, 4, 2021, "mazda-cx-5"],
  ["Hyundai", "Tucson", "suv", 3_050_000, 6, 2023, "hyundai-tucson"],
  ["Kia", "Telluride", "suv", 3_900_000, 0, 2022, "kia-telluride"],
  ["Volkswagen", "Golf GTI", "hatchback", 3_100_000, 3, 2022, "volkswagen-golf-gti"],
  ["Honda", "Civic Type R", "hatchback", 4_500_000, 0, 2023, "honda-civic-type-r"],
  ["Nissan", "Altima", "sedan", 2_400_000, 4, 2021, "nissan-altima"],
  ["Ram", "1500 Laramie", "truck", 4_700_000, 2, 2022, "ram-1500"],
  ["Ford", "F-150 XLT", "truck", 4_000_000, 3, 2021, "ford-f-150"],
  ["Rivian", "R1T", "ev", 7_300_000, 1, 2023, "rivian-r1t"],
  ["Porsche", "911 Carrera", "coupe", 12_000_000, 0, 2023, "porsche-911"],
  ["Chevrolet", "Corvette Stingray", "coupe", 7_200_000, 1, 2022, "chevrolet-corvette"],
  ["Toyota", "RAV4 Hybrid", "suv", 3_350_000, 5, 2022, "toyota-rav4"],
  ["Tesla", "Model Y", "ev", 5_200_000, 2, 2023, "tesla-model-y"],
  ["Ford", "Bronco", "suv", 4_900_000, 1, 2023, "ford-bronco"],
] as const;

// Accounts for local demos. The admin is what makes the role-gated admin
// screen testable without editing the database by hand.
const demoAccounts = [
  { email: "demo@autoline.dev", password: "demo1234", name: "Demo Driver", role: "customer" },
  { email: "admin@autoline.dev", password: "admin1234", name: "Avery Admin", role: "admin" },
] as const;

for (const account of demoAccounts) {
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, account.email))
    .limit(1);

  if (!existingUser) {
    await db.insert(users).values({
      email: account.email,
      passwordHash: await hashPassword(account.password),
      name: account.name,
      role: account.role,
    });
    console.log(`Created ${account.role} account ${account.email}.`);
  }
}

const [existing] = await db.select({ total: count() }).from(vehicles);

if (Number(existing?.total ?? 0) > 0) {
  // Older clones pointed at reused Unsplash photos. Upgrade only those rows so
  // local edits and photos added through the admin screen are left untouched.
  for (const [make, model, , , , , slug] of catalogue) {
    await db
      .update(vehicles)
      .set({ imageUrl: photoPath(slug) })
      .where(
        and(
          eq(vehicles.make, make),
          eq(vehicles.model, model),
          like(vehicles.imageUrl, "https://images.unsplash.com/%"),
        ),
      );
  }

  console.log("Vehicles already present; seed skipped.");
} else {
  await db.insert(vehicles).values(
    catalogue.map(([make, model, category, priceCents, quantity, year, slug]) => ({
      make,
      model,
      category,
      priceCents,
      quantity,
      year,
      description: `${year} ${make} ${model} — inspected, detailed, and ready for a test drive.`,
      imageUrl: photoPath(slug),
    })),
  );

  console.log(`Seeded ${catalogue.length} vehicles.`);
}

await pool.end();
