import type { Country, FlightInfo } from "./common.types";
import type { Activity } from "./activity.types";
import type { User } from "./user.types";

export interface IntineraryType {
  id: number;
  name: string;
}

export interface IntenaryStatus {
  id: number;
  name: string;
}

export interface IntenaryDates {
  id: number;
  date: string;
  activities: Activity[];
}

export interface IntenaryDatesMultiple extends IntenaryDates {
  country: Country;
  flightInfo: FlightInfo;
}

export interface DestinationBasic {
  id: number;
  startDate: string;
  endDate: string;
  status: IntenaryStatus;
  name: string;
  user: User;
  budget: number;
  image?: string;
  friends: User[];
  organizers: User[];
  interaryType: IntineraryType;
}

export interface MultipleDestinations extends DestinationBasic {
  intenaryDates: IntenaryDatesMultiple[];
}

export interface SingleDestination extends DestinationBasic {
  country: Country;
  flightInfo: FlightInfo;
  intenaryDates: IntenaryDates[];
}

export interface Intinerary {
  singleDestinations: SingleDestination[];
  multipleDestinations: MultipleDestinations[];
}
