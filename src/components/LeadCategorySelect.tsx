import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_OPTIONS, categoryBadgeClasses, categoryToRating, ratingToCategory, LeadCategory } from "@/utils/ratingUtils";

interface LeadCategorySelectProps {
  rating?: number;
  onCategoryChange?: (rating: number, category: LeadCategory) => void;
  readonly?: boolean;
  size?: "sm" | "default";
}

const LeadCategorySelect = ({ rating = 0, onCategoryChange, readonly = false, size = "default" }: LeadCategorySelectProps) => {
  const category = ratingToCategory(rating);

  if (readonly) {
    return category ? (
      <Badge variant="outline" className={categoryBadgeClasses(category)}>{category}</Badge>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }

  return (
    <Select
      value={category ?? ""}
      onValueChange={(value) => {
        const cat = value as LeadCategory;
        onCategoryChange?.(categoryToRating(cat), cat);
      }}
    >
      <SelectTrigger className={size === "sm" ? "h-8 w-[110px] text-xs" : "w-[130px]"}>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${categoryBadgeClasses(option)}`}>
              {option}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LeadCategorySelect;
