import { z } from "zod";

export const ROLES = ["customer", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  VEHICLE_OUT_OF_STOCK: "VEHICLE_OUT_OF_STOCK",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export const VEHICLE_CATEGORIES = [
  "sedan",
  "suv",
  "truck",
  "coupe",
  "ev",
  "hatchback",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const vehicleCategorySchema = z.enum(VEHICLE_CATEGORIES);

const vehicleBaseFields = {
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),
  category: vehicleCategorySchema,
  priceCents: z
    .number()
    .int("Price must be a whole number of cents")
    .nonnegative("Price cannot be negative")
    .max(1_000_000_000_000),
  year: z
    .number()
    .int()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear() + 1)
    .optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url("Image must be a valid URL").max(500).optional(),
};

export const createVehicleSchema = z
  .object({
    ...vehicleBaseFields,
    quantity: z.number().int().nonnegative("Quantity cannot be negative").max(10_000).default(0),
  })
  .strict();

export const updateVehicleSchema = z
  .object(vehicleBaseFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const vehicleSortSchema = z.enum(["price_asc", "price_desc", "newest"]);

export type VehicleSort = z.infer<typeof vehicleSortSchema>;

export const vehicleListQuerySchema = z
  .object({
    make: z.string().trim().min(1).max(60).optional(),
    model: z.string().trim().min(1).max(60).optional(),
    category: vehicleCategorySchema.optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    q: z.string().trim().min(1).max(100).optional(),
    sort: vehicleSortSchema.default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    },
  );

export type VehicleListQuery = z.infer<typeof vehicleListQuerySchema>;

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: VehicleCategory;
  priceCents: number;
  quantity: number;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VehicleListResponse {
  data: Vehicle[];
  meta: VehicleListMeta;
}

