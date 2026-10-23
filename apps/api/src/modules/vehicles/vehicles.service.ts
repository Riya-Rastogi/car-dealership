import type { Vehicle, VehicleListQuery, VehicleListResponse } from "@dealer/shared";
import type { VehicleRow } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { vehicleRepository } from "./vehicles.repository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): AppError {
  return new AppError(404, "NOT_FOUND", "Vehicle not found");
}

export function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    category: row.category,
    priceCents: row.priceCents,
    quantity: row.quantity,
    year: row.year,
    description: row.description,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const vehicleService = {
  async getById(id: string): Promise<Vehicle> {
    // Check the shape before the query: Postgres raises 22P02 on an invalid
    // uuid, and a malformed id is indistinguishable from an unknown one here.
    if (!UUID_PATTERN.test(id)) {
      throw notFound();
    }

    const vehicle = await vehicleRepository.findById(id);

    if (!vehicle) {
      throw notFound();
    }

    return toVehicle(vehicle);
  },

  async list(query: VehicleListQuery): Promise<VehicleListResponse> {
    const { rows, total } = await vehicleRepository.list(query);

    return {
      data: rows.map(toVehicle),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },
};
