import type { Country, FlightInfo, Friend } from "./common.types";
import type { ItineraryDay } from "./activity.types";

export interface Destination {
  id: number;
  country: Country;
  flightInfo?: FlightInfo;
  startDate?: string;
  endDate?: string;
  date?: string;
  note?: string;
  itinerary: ItineraryDay[];
}

export interface TripBasicSteps {
  BASIC: number;
  FRIEND: number;
  FINISH: number;
}

export interface TripBasicType {
  id: number;
  name: string;
  route: string;
  steps: TripBasicSteps;
}

export interface TripStatus {
  /** Numeric for legacy sample-driven flows; string when sourced from the
   * backend trip_statuses lookup (UUID). */
  id: number | string;
  name: string;
}

export interface TripState {
  /** Backend UUID — set when editing an existing trip so save UPDATEs
   * instead of creating a duplicate. Undefined during the new-trip flow. */
  apiId?: string;
  name?: string;
  organizer?: Friend[];
  type?: TripBasicType;
  budget?: string | number;
  total?: number;
  startDate?: string;
  endDate?: string;
  note?: string;
  people?: number;
  status?: number | TripStatus;
  /** Trip hero image. Set when a trip is started from a city / country
   * page (the destination's stock photo) and persisted to the backend
   * as `itineraries.image`. */
  image?: string;
  destinations: Destination[];
  friends?: Friend[];
}

export const emptyTripState: TripState = {
  destinations: [],
  friends: [],
  organizer: [],
};
