import type { ActionType } from "./common.types";

export interface TripChangeEvent {
  target: { value: unknown };
}

export interface TripActivityPayload {
  type: ActionType;
  value: any;
  index?: number;
  destinationIndx?: number | null;
}

export interface TripPlaceEvent {
  date: string;
  activity: TripActivityPayload;
}

export interface TripDestinationEvent {
  startDate: string;
  endDate: string;
  activity: TripActivityPayload;
  removeIndexes?: number[];
}
