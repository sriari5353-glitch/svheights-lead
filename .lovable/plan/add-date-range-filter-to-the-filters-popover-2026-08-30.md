# Add Date Range Filter to the "Filters" Popover

## Goal
Add a "Date Range" control inside the existing Filters popover in `src/pages/Index.tsx`, positioned after the Rating dropdown. It supports picking a single date or a start–end range and filters the leads list by `leadDate` (falling back to `createdAt` when a lead has no lead date). Source, Feedback, and Rating filters keep working unchanged.

## Files to Change
- `src/pages/Index.tsx`

## Implementation Steps
1. In `ContactsSection`, add state: `dateRange: { from: Date | undefined; to: Date | undefined } | undefined` (uses the existing `DateRange` shape from react-day-picker, already available via the `Calendar` component).
2. Add the new control after the Rating `Select` inside `PopoverContent`:
   - A labeled outline button (with `CalendarIcon`) showing the current selection:
     - Nothing selected → "Date Range" placeholder
     - Only `from` → formatted single date (e.g. "Aug 30, 2026")
     - `from` + `to` → "Aug 1, 2026 – Aug 30, 2026"
   - The button opens a nested `Popover` containing a `Calendar` with `mode="range"`, `selected={dateRange}`, `onSelect={setDateRange}`, `numberOfMonths={1}`, and `className="p-3 pointer-events-auto"`.
   - A small "Clear" action (text button or ✕) next to the date button, visible only when a date is selected, resets `dateRange` to `undefined`.
3. Extend the `filtered` memo with a `dateMatch` condition:
   - Get the lead's date from `l.leadDate || l.createdAt`, normalize to local day (compare year/month/day via a `startOfDay`-style comparison).
   - If only `from` is set → match leads on that exact day.
   - If `from` and `to` are set → match leads where the day is between `from` and `to` inclusive.
   - If nothing set → no date filtering.
   - Combine with existing conditions: `qMatch && srcMatch && fbMatch && ratingMatch && dateMatch`, and add `dateRange` to the memo dependency array.
4. Leave the Source, Feedback, and Rating `Select` components and their state/logic untouched.

## Technical Details
- Uses the already-imported `Popover`, `Calendar`, `Button`, `CalendarIcon`, and `format` (date-fns) — only new import needed is the `DateRange` type from `react-day-picker`.
- Day comparison is done with local-midnight normalization to avoid timezone off-by-one errors (consistent with the app's existing date handling in `LeadForm`).
- No database or backend changes.

## Acceptance Criteria
- Filters popover shows Source, Feedback, Rating, then the new Date Range control in that order.
- Picking one day filters the list to leads entered that day.
- Picking a start and end date filters to leads within the inclusive range.
- Clearing the date filter restores the unfiltered list.
- Source, Feedback, and Rating filters behave exactly as before and combine correctly with the date filter.
