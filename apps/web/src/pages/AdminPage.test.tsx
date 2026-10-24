import type { Vehicle, VehicleListResponse } from "@dealer/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api.js";
import { AdminPage } from "./AdminPage.js";

vi.mock("../lib/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      listVehicles: vi.fn(),
      createVehicle: vi.fn(),
      restockVehicle: vi.fn(),
      deleteVehicle: vi.fn(),
    },
  };
});

const listVehicles = vi.mocked(api.listVehicles);

const vehicle: Vehicle = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  make: "Toyota",
  model: "Camry",
  category: "sedan",
  priceCents: 2_650_000,
  quantity: 3,
  year: 2022,
  description: null,
  imageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const response: VehicleListResponse = {
  data: [vehicle],
  meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
};

function renderAdmin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  listVehicles.mockResolvedValue(response);
});

describe("AdminPage", () => {
  it("lists inventory with stock and the management actions", async () => {
    renderAdmin();

    expect(await screen.findByRole("link", { name: "2022 Toyota Camry" })).toBeInTheDocument();
    expect(screen.getByText("3 units")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByText("Units on lot")).toBeInTheDocument();
  });

  it("opens the restock dialog for the selected vehicle", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("button", { name: "Restock" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Restock Toyota Camry" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Units to add")).toHaveValue(1);
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(
      screen.getByRole("heading", { name: "Remove Toyota Camry?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove vehicle" })).toBeInTheDocument();
  });

  it("validates the create form before calling the API", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(await screen.findByRole("button", { name: "Add vehicle" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add vehicle" }));

    expect(within(dialog).getByText("Make is required")).toBeInTheDocument();
    expect(within(dialog).getByText("Model is required")).toBeInTheDocument();
    expect(within(dialog).getByText("Price is required")).toBeInTheDocument();
    expect(api.createVehicle).not.toHaveBeenCalled();
  });
});
