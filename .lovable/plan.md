# Abroad Phone Number Mode in Lead Form

## Goal
Add an "Abroad Number" toggle beside the Phone Number field in the Add/Edit Lead form. Default behavior (Indian +91 rules) stays exactly as-is unless the user activates Abroad mode.

## Changes

### 1. `src/components/LeadForm.tsx`
- Add an `isAbroad` boolean state (default `false`; initialized from the existing phone when editing — if the stored phone starts with `+` but not `+91`, open in Abroad mode).
- Next to the Phone Number label/field, add a small "Abroad Number" button with a `ChevronDown` icon.
  - Single click on the button switches directly into Abroad mode (no dropdown, no "Indian Number" menu item).
  - While in Abroad mode, the button switches back to the standard Indian field (label shows e.g. "Indian Number" state so the user can return — one click toggles).
- **Default mode (untouched):** keep the existing `PhoneInput` component, `isValidIndianMobile` validation, and error message exactly as they are.
- **Abroad mode:**
  - Hide/disable the Indian `PhoneInput` and show a plain text/tel `Input` labeled "Abroad Phone Number".
  - Accept the number as typed (digits, spaces, `+`, dashes). No +91 enforcement, no 10-digit/6-9-start validation.
  - Light validation only: must be non-empty and contain at least 6 digits.
  - On submit, normalize for storage: strip spaces/dashes and ensure a leading `+` (prepend `+` if missing). This is required because `CRMContext.addLead`/`updateLead` run `addIndiaCode()`, which only skips numbers already starting with `+` — this keeps abroad numbers from getting a wrong +91 prefix without touching shared context logic.
- Submit logic: run `isValidIndianMobile` only when `isAbroad === false`.
- Reset `isAbroad` to `false` after adding a new lead.

### 2. Edit flow
- When editing a lead whose stored phone is non-+91 international (starts with `+`, not `+91`), the form opens in Abroad mode with the number shown as stored.

## What does NOT change
- `PhoneInput.tsx`, `phoneUtils.ts`, `CRMContext.tsx` — untouched; Indian formatting, paste sanitization, duplicate checking, and WhatsApp formatting keep working for both number types (WhatsApp `wa.me` links already strip the `+`).
- Database schema — phone remains a single text column; uniqueness stays per-user `(created_by, phone)`.

## Verification
- Build passes; in preview: add an Indian lead (validation still blocks bad numbers), toggle Abroad Number, save e.g. `+1 415 555 2671`, confirm it is stored/displayed without +91, edit it, and confirm switching modes mid-form behaves correctly.
