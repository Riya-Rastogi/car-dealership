import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Playwright's API client resolves `localhost` to ::1 first, while the Express
// server binds IPv4, so the direct API calls pin the loopback address.
const API = "http://127.0.0.1:3000/api";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Find your/ })).toBeVisible();
}

async function adminToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API}/auth/login`, {
    data: { email: "admin@autoline.dev", password: "admin1234" },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.token as string;
}

async function createVehicle(
  request: APIRequestContext,
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; make: string; model: string }> {
  const suffix = Date.now().toString(36).slice(-5);
  const vehicle = {
    make: `E2E${suffix}`,
    model: `Coupe ${suffix}`,
    category: "coupe",
    priceCents: 2_500_000,
    quantity: 1,
    year: 2024,
    description: "Temporary vehicle created by the Playwright suite.",
    ...overrides,
  };

  const response = await request.post(`${API}/vehicles`, {
    headers: { Authorization: `Bearer ${token}` },
    data: vehicle,
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  return { id: body.vehicle.id, make: body.vehicle.make, model: body.vehicle.model };
}

async function deleteVehicle(request: APIRequestContext, token: string, id: string) {
  await request.delete(`${API}/vehicles/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test("customer buys a car and sees it in the garage", async ({ page, request }) => {
  const token = await adminToken(request);
  const vehicle = await createVehicle(request, token);
  const fullName = `${vehicle.make} ${vehicle.model}`;
  const email = `buyer-${Date.now()}@example.com`;

  try {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Playwright Buyer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("driver123");
    await page.getByLabel("Confirm password").fill("driver123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: /Find your/ })).toBeVisible();

    await page.getByLabel("Search by make or model").fill(vehicle.model);
    const card = page.getByRole("link", { name: new RegExp(fullName) });
    await expect(card).toBeVisible();
    await card.click();

    await expect(page.getByRole("heading", { name: new RegExp(vehicle.model) })).toBeVisible();
    await page.getByRole("button", { name: "Purchase this car" }).click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog.getByRole("heading", { name: new RegExp(vehicle.model) })).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm purchase" }).click();

    await expect(page.getByText("Purchase complete")).toBeVisible();
    await page.getByRole("link", { name: /View garage/ }).click();

    await expect(page).toHaveURL(/\/garage$/);
    await expect(page.getByRole("link", { name: new RegExp(vehicle.model) })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Your garage/ })).toBeVisible();
  } finally {
    await deleteVehicle(request, token, vehicle.id);
  }
});

test("admin creates, restocks, edits and deletes a listing", async ({ page, request }) => {
  const token = await adminToken(request);
  const suffix = Date.now().toString(36).slice(-5);
  const make = `Admin${suffix}`;
  const model = `Roadster ${suffix}`;

  await signIn(page, "admin@autoline.dev", "admin1234");
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Run the lot/ })).toBeVisible();

  await page.getByRole("button", { name: "Add vehicle" }).click();
  const createDialog = page.locator("dialog[open]");
  await createDialog.getByLabel("Make").fill(make);
  await createDialog.getByLabel("Model").fill(model);
  await createDialog.getByLabel("Body style").selectOption("coupe");
  await createDialog.getByLabel("Price (USD)").fill("42000");
  await createDialog.getByLabel("Initial stock").fill("1");
  await createDialog.getByLabel("Year (optional)").fill("2024");
  await createDialog.getByLabel("Description (optional)").fill("E2E listing");
  await createDialog.getByRole("button", { name: "Add vehicle" }).click();

  await expect(page.getByText("Vehicle added to the lot")).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(model) });
  await expect(row).toBeVisible();
  await expect(row.getByText("1 units")).toBeVisible();

  await row.getByRole("button", { name: "Restock" }).click();
  const restockDialog = page.locator("dialog[open]");
  await restockDialog.getByLabel("Units to add").fill("2");
  await restockDialog.getByRole("button", { name: "Add units" }).click();
  await expect(page.getByText("Stock updated")).toBeVisible();
  await expect(row.getByText("3 units")).toBeVisible();

  const vehicleId = await row
    .getByRole("link", { name: new RegExp(model) })
    .getAttribute("href")
    .then((href) => href?.split("/").pop() ?? "");

  await row.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.locator("dialog[open]");
  await expect(editDialog.getByText("Use Restock to change this.")).toBeVisible();
  await editDialog.getByLabel("Price (USD)").fill("39500");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Listing updated")).toBeVisible();
  await expect(row.getByText("$39,500")).toBeVisible();

  await row.getByRole("button", { name: "Delete" }).click();
  const deleteDialog = page.locator("dialog[open]");
  await expect(deleteDialog.getByRole("heading", { name: new RegExp(model) })).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Remove vehicle" }).click();
  await expect(page.getByText("Vehicle removed")).toBeVisible();
  await expect(row).toHaveCount(0);

  await deleteVehicle(request, token, vehicleId);
});

test("out-of-stock vehicle disables the purchase action", async ({ page, request }) => {
  const token = await adminToken(request);
  const vehicle = await createVehicle(request, token, { quantity: 0 });
  const email = `browser-${Date.now()}@example.com`;

  try {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Playwright Browser");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("driver123");
    await page.getByLabel("Confirm password").fill("driver123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: /Find your/ })).toBeVisible();

    await page.goto(`/vehicles/${vehicle.id}`);

    await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    await expect(page.getByText("This one just left the lot.")).toBeVisible();
  } finally {
    await deleteVehicle(request, token, vehicle.id);
  }
});
