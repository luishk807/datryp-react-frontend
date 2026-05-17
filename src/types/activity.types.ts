import type { Friend, ImageRef } from "./common.types";

export interface ActivityStatus {
  /** Numeric for legacy sample data; string (UUID) when sourced from the
   *  backend `trip_statuses` lookup. Activities and itineraries share the
   *  same lookup table, so a status assigned via `useTripStatuses()` is
   *  directly persistable on either. */
  id: number | string;
  name: string;
}

export interface ShareCostEntry {
  name: string;
  amount: string;
  status: string;
}

export interface BudgetItem {
  id: number;
  user: Friend;
  budget: string | number;
}

export type BudgetEntry = Omit<BudgetItem, "id">;

export interface Activity {
  id: number;
  name?: string;
  place?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  cost?: string | number;
  note?: string;
  image?: ImageRef;
  status?: number | ActivityStatus;
  budget?: BudgetItem[];
  shareCost?: ShareCostEntry[];
  people?: string | number;
}

export interface ItineraryDay {
  id: number;
  date: string;
  activities: Activity[];
}
