# Task 3 Report: Profile Form — Height, Age, Sex

## Status

DONE

## Summary

Successfully extended the profile form and API to expose all bio fields: height (cm), age, weight (kg), and sex alongside existing calorie goal.

## Changes Completed

1. **`app/api/profile/route.ts`** — Updated ProfileSchema to accept optional fields for heightCm, weightKg, age, and sex. Modified the update statement to use the complete parsed.data object instead of hardcoding calorieGoal alone.

2. **`components/ProfileForm.tsx`** — Created new component replacing CalorieGoalForm with a multi-field profile form. Form state manages all five fields (calorieGoal, heightCm, weightKg, age, sex), coerces to empty strings for null optionals to prevent controlled/uncontrolled warnings, and sends only non-empty fields to the API. Sex field uses a select dropdown with male/female/other options.

3. **`app/(dashboard)/profile/page.tsx`** — Updated to import ProfileForm instead of CalorieGoalForm and pass all five bio fields. Section header changed from "Goals" to "Goals &amp; Body" to reflect expanded scope. Defaults: calorieGoal 2300 kcal, other fields null.

4. **`components/CalorieGoalForm.tsx`** — Deleted via git rm.

## Verification

- TypeScript type check (`npx tsc --noEmit`) passed with no errors.
- All four files (API, component, page, deleted) modified as specified.
- Form state coerces optional fields to empty strings to prevent React warnings; sends only populated fields in the POST body.
- Validation in ProfileSchema ensures safe numeric ranges: calorieGoal 500–10000, heightCm 50–300, weightKg 20–500, age 10–120.

## Commit

```
39fd7df feat: add height/age/sex to profile form and API (#5)
```

## Test Notes

No automated tests were specified in the brief. Manual testing should verify:
- Profile form renders all five fields with correct placeholder behavior.
- Empty optional fields do not send null values to the API.
- API rejects invalid values (e.g., age 5, height 0).
- Save confirmation message appears for 2 seconds after successful submission.

## Concerns

None. All requirements from the brief have been met. The schema change is backward compatible (all new fields are optional), and the form gracefully handles null values for existing users.

## Post-Review Fix

Fixed conditional calorieGoal assignment in ProfileForm.tsx line 31. Changed from:
```tsx
if (form.calorieGoal) body.calorieGoal = Number(form.calorieGoal)
```
to:
```tsx
body.calorieGoal = Number(form.calorieGoal)
```

Reasoning: calorieGoal is a required field (not optional in props), so the check was unnecessary and could silently drop the field if falsy.

- TypeScript check: PASS (no output, no errors)
- Commit: `8c2f443cea6a15ba356b00f6384aab542dafe3bc`
