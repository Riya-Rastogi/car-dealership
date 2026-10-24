/**
 * Regenerates the README screenshots against the running dev stack.
 *
 * Prerequisites:
 *   - PostgreSQL running, `npm run db:migrate` and `npm run db:seed` applied
 *   - `npm run dev:api` and `npm run dev:web` running
 *   - Google Chrome installed (the script uses the installed browser, no download)
 *
 * Run with `npm run screenshots`. The script restocks the demo car before
 * buying it, so repeated runs do not drain the seeded inventory. A fresh
 * buyer account is created for each run so the garage always shows one car.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const base = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:5173";
const apiBase = process.env.SCREENSHOT_API_URL ?? "http://127.0.0.1:3000/api";
const out = "docs/screenshots";
fs.mkdirSync(out, { recursive: true });

interface ApiOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

async function api<T = Record<string, unknown>>(
  path: string,
  { method = "GET", token, body }: ApiOptions = {},
): Promise<{ status: number; body: T }> {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: response.status, body: (await response.json().catch(() => null)) as T };
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
}

const adminLogin = await api<{ token: string }>("/auth/login", {
  method: "POST",
  body: { email: "admin@autoline.dev", password: "admin1234" },
});

if (adminLogin.status !== 200) {
  throw new Error("Admin login failed. Run npm run db:seed and make sure the API is up.");
}

const adminToken = adminLogin.body.token;
const list = await api<{ data: Vehicle[] }>("/vehicles?limit=100", { token: adminToken });
const vehicles = list.body.data;
const pick = (needle: string): Vehicle | undefined =>
  vehicles.find((vehicle) => `${vehicle.make} ${vehicle.model}`.includes(needle));

const mustang = pick("Mustang GT");
const telluride = pick("Telluride");
const camry = pick("Camry");

if (!mustang || !telluride || !camry) {
  throw new Error("Seed data is missing. Run npm run db:seed.");
}

// Keep the seeded stock count stable: add the unit this run is about to buy.
const restock = await api(`/vehicles/${camry.id}/restock`, {
  method: "POST",
  token: adminToken,
  body: { quantity: 1 },
});

if (restock.status !== 200) {
  throw new Error(`Could not restock ${camry.make} ${camry.model}`);
}

const suffix = Date.now().toString(36);
const buyer = {
  name: "Demo Driver",
  email: `showcase-${suffix}@autoline.dev`,
  password: "showcase123",
};
const registered = await api<{ token: string }>("/auth/register", {
  method: "POST",
  body: buyer,
});

if (registered.status !== 201) {
  throw new Error(`Could not register the screenshot buyer: ${JSON.stringify(registered.body)}`);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.setDefaultTimeout(25_000);

async function shot(name: string): Promise<void> {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}.png`, animations: "disabled" });
  console.log(`shot ${name}`);
}

async function settle(): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
        ),
    );
  });
  await page.waitForTimeout(700);
}

async function signIn(email: string, password: string): Promise<void> {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/`);
}

try {
  await page.goto(`${base}/login`);
  await page.getByText("Welcome back").waitFor();
  await shot("01-login");

  await signIn(buyer.email, buyer.password);
  await page.getByRole("heading", { name: /Find your/ }).waitFor();
  await settle();
  await shot("02-dashboard");

  await page.goto(`${base}/vehicles/${mustang.id}`);
  await page.getByRole("heading", { name: new RegExp(mustang.model) }).waitFor();
  await settle();
  await shot("03-vehicle-detail");

  await page.goto(`${base}/vehicles/${telluride.id}`);
  await page.getByRole("button", { name: "Out of stock" }).waitFor();
  await settle();
  await shot("04-out-of-stock");

  await page.goto(`${base}/vehicles/${camry.id}`);
  await page.getByRole("button", { name: "Purchase this car" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Confirm purchase" }).click();
  await page.getByText("Purchase complete").waitFor();
  await shot("05-purchase-toast");

  await page.getByRole("link", { name: /View garage/ }).click();
  await page.waitForURL(`${base}/garage`);
  await page.getByRole("heading", { name: /Your garage/ }).waitFor();
  await settle();
  await shot("06-garage");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(`${base}/login`);
  await signIn("admin@autoline.dev", "admin1234");
  await page.goto(`${base}/admin`);
  await page.getByRole("heading", { name: /Run the lot/ }).waitFor();
  await settle();
  await shot("07-admin");

  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(400);
  await shot("08-admin-form");
  await page.keyboard.press("Escape");

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 375, height: 812 });
  await mobile.goto(`${base}/`);
  await mobile.getByRole("heading", { name: /Find your/ }).waitFor();
  await mobile.waitForLoadState("networkidle");
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: `${out}/09-mobile.png`, animations: "disabled" });
  console.log("shot 09-mobile");
} finally {
  await browser.close();
}

console.log("Screenshots written to docs/screenshots");
