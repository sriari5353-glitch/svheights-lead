import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "default" | "lg";
}

const StarRating = ({ rating = 0, onRatingChange, readonly = false, size = "default" }: StarRatingProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const handleClick = (newRating: number) => {
    if (readonly || !onRatingChange) return;
    onRatingChange(newRating);
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readonly}
          className={cn(
            "transition-colors",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "fill-none text-muted-foreground"
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium">
        {rating}/5
      </span>
    </div>
  );
};

export default StarRating;