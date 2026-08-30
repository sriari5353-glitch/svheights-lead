# Group Filter Dropdowns Behind a Single "Filters" Button

## Goal
Replace the three visible filter dropdowns (Source, Feedback, Rating) in the main leads list with one compact "Filters" button that opens a popover containing the same three dropdowns. The dropdown behavior and filtering logic must remain unchanged.

## Files to Change
- `src/pages/Index.tsx`

## Implementation Steps
1. Locate the filter bar in `src/pages/Index.tsx` (around the Source/Feedback/Rating Select components and the static "Filters" label).
2. Replace the static "Filters" label and the three inline Select triggers with a single `Popover` trigger button labeled "Filters" with a right arrow (`ChevronRight`) icon.
3. Move the Source, Feedback, and Rating `Select` components unchanged into `PopoverContent`, preserving their current `value`, `onValueChange`, options, and placeholder text.
4. Keep the existing state variables (`src`, `fb`, `ratingFilter`) and filtering logic untouched so functionality is identical.
5. Style the popover content with a simple vertical stack layout so the three dropdowns are clearly visible and easy to use.

## Acceptance Criteria
- Only one "Filters" button is visible in the filter bar when no popover is open.
- Clicking the button opens a popover showing Source, Feedback, and Rating dropdowns.
- Selecting values in each dropdown filters the leads list exactly as before.
- The right arrow icon is present on the button.
