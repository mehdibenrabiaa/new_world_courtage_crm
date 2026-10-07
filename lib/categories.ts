// Single source of truth for insurance categories — used by guides (category
// field) and leads (what the lead is for). Keep in sync with the backend's
// LeadType enum values (app/models.py) if you add/remove one here.
//
// The products New World Courtage sells today — the only ones offered in
// the CRM's pickers and filters. "Assurance Garage" covers garagistes,
// convoyeurs and négociants (one form on the site, the activity is in the
// lead's answers).
export const CATEGORIES = [
  "Assurance Auto",
  "Assurance Moto",
  "Assurance Risques aggravés",
  "Assurance Taxi",
  "Assurance VTC",
  "Assurance Garage",
  "Assurance Général",
] as const

// Products no longer sold. Records created with them before still load and
// display their category; they just can't be picked for new ones.
export const LEGACY_CATEGORIES = [
  "Assurance Flotte & Transport",
  "Assurance Ambulance",
  "Assurance Pro de l'auto",
  "Assurance Construction",
  "Assurance Immobilier",
] as const

export type Category = (typeof CATEGORIES)[number] | (typeof LEGACY_CATEGORIES)[number]

// Options for a category picker on an existing record: today's products, plus
// the record's own category if it's a retired one, so it still shows as
// selected instead of blank.
export function categoryOptions(current?: string | null): string[] {
  const options: string[] = [...CATEGORIES]
  if (current && !options.includes(current)) options.push(current)
  return options
}
