import type { Purchase, Vehicle } from "@dealer/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../lib/api.js";
import { VehicleDetailPage } from "./VehicleDetailPage.js";

vi.mock("../lib/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getVehicle: vi.fn(),
      purchaseVehicle: vi.fn(),
    },
  };
});

const getVehicle = vi.mocked(api.getVehicle);
const purchaseVehicle = vi.mocked(api.purchaseVehicle);

const vehicle: Vehicle = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  make: "Ford",
  model: "Mustang GT",
  category: "coupe",
  priceCents: 3_950_000,
  quantity: 2,
  year: 2021,
  description: "V8, manual, one owner.",
  imageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const purchase: Purchase = {
  id: "2f8fad5b-d9cb-469f-a165-70867728950e",
  vehicleId: vehicle.id,
  quantity: 1,
  unitPriceCents: vehicle.priceCents,
  totalCents: vehicle.priceCents,
  createdAt: "2026-01-02T00:00:00.000Z",
  vehicle,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/vehicles/${vehicle.id}`]}>
        <Routes>
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getVehicle.mockResolvedValue(vehicle);
  purchaseVehicle.mockReset();
});

describe("VehicleDetailPage", () => {
  it("disables the purchase button when the vehicle is out of stock", async () => {
    getVehicle.mockResolvedValue({ ...vehicle, quantity: 0 });

    renderPage();

    const button = await screen.findByRole("button", { name: "Out of stock" });
    expect(button).toBeDisabled();
    expect(screen.getByText("This one just left the lot. Browse the inventory for the next arrival.")).toBeInTheDocument();
  });

  it("confirms the purchase and shows a success toast", async () => {
    const user = userEvent.setup();
    purchaseVehicle.mockResolvedValue({ vehicle: { ...vehicle, quantity: 1 }, purchase });

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Purchase this car" }));
    await user.click(screen.getByRole("button", { name: "Confirm purchase" }));

    expect(purchaseVehicle).toHaveBeenCalledWith(vehicle.id);
    expect(await screen.findByText("Purchase complete")).toBeInTheDocument();
    expect(screen.getByText("Ford Mustang GT is now in your garage.")).toBeInTheDocument();
    expect(screen.getAllByText("1 available").length).toBeGreaterThan(0);
  });

  it("rolls back the optimistic decrement and explains a lost race", async () => {
    const user = userEvent.setup();
    purchaseVehicle.mockRejectedValue(
      new ApiError(409, "VEHICLE_OUT_OF_STOCK", "This vehicle is out of stock"),
    );

    renderPage();

    await user.click(await screen.findByRole("button", { name: "Purchase this car" }));
    await user.click(screen.getByRole("button", { name: "Confirm purchase" }));

    expect(await screen.findByText("Someone bought it first")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("2 available").length).toBeGreaterThan(0);
    });
  });

  it("shows a not-found state for an unknown vehicle", async () => {
    getVehicle.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Vehicle not found"));

    renderPage();

    expect(await screen.findByText("That car isn't here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to inventory" })).toHaveAttribute("href", "/");
  });
});
