import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl } from "./api.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("apiUrl", () => {
  it("defaults to the same-origin /api prefix", () => {
    expect(apiUrl("/vehicles")).toBe("/api/vehicles");
  });

  it("uses the deployed API base and trims trailing slashes", () => {
    vi.stubEnv("VITE_API_URL", "https://autoline-api.onrender.com/api/");

    expect(apiUrl("/vehicles")).toBe("https://autoline-api.onrender.com/api/vehicles");
  });
});
