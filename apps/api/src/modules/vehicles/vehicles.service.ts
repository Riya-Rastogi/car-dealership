import type { Vehicle, VehicleListQuery, VehicleListResponse } from "@dealer/shared";
import type { VehicleRow } from "../../db/schema.js";
import { vehicleRepository } from "./vehicles.repository.js";

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
