import type {
  Purchase,
  PurchaseListResponse,
  PurchaseResponse,
  Vehicle,
} from "@dealer/shared";
import type { PurchaseRow } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { toVehicle } from "../vehicles/vehicles.service.js";
import { inventoryRepository } from "./inventory.repository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): AppError {
  return new AppError(404, "NOT_FOUND", "Vehicle not found");
}

function toPurchase(row: PurchaseRow, vehicle: Vehicle | null): Purchase {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    quantity: row.quantity,
    unitPriceCents: row.unitPriceCents,
    totalCents: row.totalCents,
    createdAt: row.createdAt.toISOString(),
    vehicle,
  };
}

export const inventoryService = {
  async purchase(userId: string, vehicleId: string): Promise<PurchaseResponse> {
    if (!UUID_PATTERN.test(vehicleId)) {
      throw notFound();
    }

    const result = await inventoryRepository.purchase(userId, vehicleId);

    if (result.kind === "missing") {
      throw notFound();
    }

    if (result.kind === "out_of_stock") {
      throw new AppError(409, "VEHICLE_OUT_OF_STOCK", "This vehicle is out of stock");
    }

    const vehicle = toVehicle(result.vehicle);

    return {
      vehicle,
      purchase: toPurchase(result.purchase, vehicle),
    };
  },

  async restock(vehicleId: string, quantity: number): Promise<Vehicle> {
    if (!UUID_PATTERN.test(vehicleId)) {
      throw notFound();
    }

    const vehicle = await inventoryRepository.restock(vehicleId, quantity);

    if (!vehicle) {
      throw notFound();
    }

    return toVehicle(vehicle);
  },

  async listPurchases(userId: string): Promise<PurchaseListResponse> {
    const rows = await inventoryRepository.listPurchases(userId);

    return {
      data: rows.map(({ purchase, vehicle }) => toPurchase(purchase, toVehicle(vehicle))),
    };
  },
};
