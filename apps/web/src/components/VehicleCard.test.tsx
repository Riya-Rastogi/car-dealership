import type { Vehicle } from "@dealer/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { VehicleCard } from "./VehicleCard.js";

const vehicle: Vehicle = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  make: "Toyota",
  model: "Camry SE",
  category: "sedan",
  priceCents: 2_650_000,
  quantity: 3,
  year: 2022,
  description: null,
  imageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderCard(overrides: Partial<Vehicle> = {}) {
  return render(
    <MemoryRouter>
      <VehicleCard vehicle={{ ...vehicle, ...overrides }} />
    </MemoryRouter>,
  );
}

describe("VehicleCard", () => {
  it("links to the vehicle detail and shows its price and stock", () => {
    renderCard();

    expect(screen.getByRole("link")).toHaveAttribute("href", `/vehicles/${vehicle.id}`);
    expect(screen.getByText("$26,500")).toBeInTheDocument();
    expect(screen.getByText("3 available")).toBeInTheDocument();
  });

  it("renders an out-of-stock card for a vehicle with no units", () => {
    renderCard({ quantity: 0 });

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByText("Currently unavailable")).toBeInTheDocument();
  });

  it("uses the singular label for the last unit", () => {
    renderCard({ quantity: 1 });

    expect(screen.getByText("1 available")).toBeInTheDocument();
  });
});
