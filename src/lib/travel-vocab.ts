/**
 * App-wide travel vocabularies. Pure constants — safe to import anywhere.
 * Stored as plain text in the DB; these lists are the validation gate and can
 * grow without a migration.
 */

/** How a trip was taken. Shared by user preferences and journeys. */
export const TRAVEL_STYLES = [
  "solo",
  "couple",
  "family",
  "friends",
  "backpacking",
  "luxury",
  "roadtrip",
  "adventure",
  "slow",
  "city",
  "nature",
  "culture",
] as const;
export type TravelStyle = (typeof TRAVEL_STYLES)[number];

/** Primary ways of getting around on a journey. */
export const TRANSPORT_MODES = ["flight", "train", "bus", "car", "bike", "boat", "walk"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

/** Itinerary stop kinds — mirrors the `StopType` Postgres enum. */
export const STOP_TYPES = ["ACTIVITY", "TRANSIT", "LODGING", "FOOD", "NOTE"] as const;
export type StopTypeValue = (typeof STOP_TYPES)[number];

/** A small set of currencies the budget UI offers. */
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "THB", "SGD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];
