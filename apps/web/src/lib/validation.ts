/**
 * Turns a Zod issue array from the API's validation error into a
 * field-name -> message map the forms can render inline.
 */
export function fieldErrorsFrom(details: unknown): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!Array.isArray(details)) {
    return errors;
  }

  for (const issue of details) {
    if (
      typeof issue !== "object" ||
      issue === null ||
      !("message" in issue) ||
      typeof issue.message !== "string"
    ) {
      continue;
    }

    const path = "path" in issue && Array.isArray(issue.path) ? issue.path : [];
    const field = path.length > 0 ? String(path[0]) : "form";

    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
