// Single source of truth for insurance categories — used by guides (category
// field) and leads (what the lead is for). Keep in sync with the backend's
// LeadType enum values (app/models.py) if you add/remove one here.
export const CATEGORIES = [
  "Assurance Flotte & Transport",
  "Assurance Taxi",
  "Assurance Ambulance",
  "Assurance VTC",
  "Assurance Pro de l'auto",
  "Assurance Construction",
  "Assurance Immobilier",
  "Assurance Général",
] as const

export type Category = (typeof CATEGORIES)[number]
