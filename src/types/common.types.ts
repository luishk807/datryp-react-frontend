import type {
  ACTION,
  ACTIVITY_KIND,
  AUTH_MODE,
  BUDGET_STATUS,
  BUTTON_VARIANT,
  ITINERARY_TYPE,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
  TRIP_MODE,
  TRIP_STATUS,
  USER_ROLE,
} from "constants";

export type ActionType = (typeof ACTION)[keyof typeof ACTION];
export type ActivityKind = (typeof ACTIVITY_KIND)[keyof typeof ACTIVITY_KIND];
export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];
export type BudgetStatus = (typeof BUDGET_STATUS)[keyof typeof BUDGET_STATUS];
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
export type ItineraryTypeName = (typeof ITINERARY_TYPE)[keyof typeof ITINERARY_TYPE];
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
export type TripMode = (typeof TRIP_MODE)[keyof typeof TRIP_MODE];
export type TripStatusName = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * Shared props for "add/edit modal button" components (e.g. AddDestination,
 * AddPlaceBtn). Extend it and add the fields unique to that component.
 * - TDraft: shape passed to onChange (the work-in-progress object)
 * - TData:  shape of the existing record being edited
 */
export interface AddEditButtonProps<TDraft, TData> {
  onChange?: (item: TDraft) => void;
  type?: typeof ACTION.ADD | typeof ACTION.EDIT;
  data?: TData | null;
  buttonType?: typeof BUTTON_VARIANT.TEXT | typeof BUTTON_VARIANT.STANDARD;
  isViewMode?: boolean;
}

export interface Friend {
  id: number;
  label?: string;
  name?: string;
  /** Backend User UUID — preserved so the save mutation can use it for
   * participantIds / organizerIds. Optional for legacy/mock entries. */
  userId?: string;
}

export interface Country {
  id: number | string;
  name: string;
  code?: string;
  local?: string;
  image?: string;
}

export interface FlightInfo {
  departDate?: string;
  departTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  flightNumber?: string;
  departAirport?: string;
  arrivalAirport?: string;
}

export interface ImageRef {
  url: string;
  name: string;
}
