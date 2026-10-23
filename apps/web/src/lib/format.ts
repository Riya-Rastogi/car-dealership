const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** The API stores integer cents; show whole dollars in the UI. */
export function formatPrice(cents: number): string {
  return currency.format(cents / 100);
}

export function formatCategory(category: string): string {
  if (category === "ev") {
    return "Electric";
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function stockLabel(quantity: number): string {
  if (quantity === 0) {
    return "Out of stock";
  }

  if (quantity === 1) {
    return "1 available";
  }

  return `${quantity} available`;
}
