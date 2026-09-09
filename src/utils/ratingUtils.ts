export type LeadCategory = "Cold" | "Warm" | "Hot";

/**
 * Mapping between the stored numeric rating (0-5) and lead categories:
 * - 1 star      -> Cold
 * - 2 to 3 stars -> Warm
 * - 4 to 5 stars -> Hot
 * - 0 (unrated) -> null
 */
export const ratingToCategory = (rating?: number): LeadCategory | null => {
  const r = rating || 0;
  if (r <= 0) return null;
  if (r === 1) return "Cold";
  if (r <= 3) return "Warm";
  return "Hot";
};

/** Stored numeric value for each category. */
export const categoryToRating = (category: LeadCategory): number => {
  switch (category) {
    case "Cold": return 1;
    case "Warm": return 3;
    case "Hot": return 5;
  }
};

export const CATEGORY_OPTIONS: LeadCategory[] = ["Cold", "Warm", "Hot"];

/** Badge styling for a category. */
export const categoryBadgeClasses = (category: LeadCategory | null): string => {
  switch (category) {
    case "Hot":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "Warm":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Cold":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};
