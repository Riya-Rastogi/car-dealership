import type {
  ApiErrorBody,
  AuthResponse,
  CreateVehicleInput,
  LoginInput,
  PublicUser,
  PurchaseListResponse,
  PurchaseResponse,
  RegisterInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleCategory,
  VehicleListResponse,
  VehicleSort,
} from "@dealer/shared";

const TOKEN_KEY = "autoline.token";

/**
 * In development Vite proxies `/api` to the local Express server. A split
 * deployment sets VITE_API_URL to the API base, including the `/api` prefix.
 */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");
  return `${base}${path}`;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Private browsing can deny storage; the in-memory session still works.
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = readToken();

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the API. Is the server running?");
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    if (response.status === 401 && token) {
      // The token expired or the account was removed; drop the session.
      window.dispatchEvent(new Event("autoline:unauthorized"));
    }

    throw new ApiError(
      response.status,
      body?.error?.code ?? "INTERNAL_ERROR",
      body?.error?.message ?? "Something went wrong",
      body?.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface VehicleListParams {
  q?: string;
  make?: string;
  model?: string;
  category?: VehicleCategory;
  minPrice?: number;
  maxPrice?: number;
  sort?: VehicleSort;
  page?: number;
  limit?: number;
}

function toQueryString(params: VehicleListParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  register(input: RegisterInput): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  login(input: LoginInput): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async me(): Promise<PublicUser> {
    const response = await request<{ user: PublicUser }>("/auth/me");
    return response.user;
  },

  listVehicles(params: VehicleListParams = {}): Promise<VehicleListResponse> {
    return request<VehicleListResponse>(`/vehicles${toQueryString(params)}`);
  },

  async getVehicle(id: string): Promise<Vehicle> {
    const response = await request<{ vehicle: Vehicle }>(`/vehicles/${id}`);
    return response.vehicle;
  },

  purchaseVehicle(id: string): Promise<PurchaseResponse> {
    return request<PurchaseResponse>(`/vehicles/${id}/purchase`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async restockVehicle(id: string, quantity: number): Promise<Vehicle> {
    const response = await request<{ vehicle: Vehicle }>(`/vehicles/${id}/restock`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    });
    return response.vehicle;
  },

  async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    const response = await request<{ vehicle: Vehicle }>("/vehicles", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.vehicle;
  },

  async updateVehicle(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    const response = await request<{ vehicle: Vehicle }>(`/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return response.vehicle;
  },

  deleteVehicle(id: string): Promise<void> {
    return request<void>(`/vehicles/${id}`, { method: "DELETE" });
  },

  listPurchases(): Promise<PurchaseListResponse> {
    return request<PurchaseListResponse>("/purchases");
  },
};
