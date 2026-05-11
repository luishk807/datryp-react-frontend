export type ActionType = "add" | "edit" | "delete";

export interface Friend {
  id: number;
  label?: string;
  name?: string;
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

export interface ActivityStatus {
  id: number;
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
  id: number;
  name: string;
}

export interface TripState {
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
  destinations: Destination[];
  friends?: Friend[];
}

export const emptyTripState: TripState = {
  destinations: [],
  friends: [],
  organizer: [],
};

export interface IntineraryType {
  id: number;
  name: string;
}
export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
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
  intineraryType: IntineraryType;
  date: string;
}

export interface MultipleDestinations extends DestinationBasic {
  intenaryDates: IntenaryDatesMultiple[];
}

export interface SingleDestination extends DestinationBasic {
  country: Country;
  flightInfo: FlightInfo;
  intenaryDates: IntenaryDates[];
}

export interface Destinations {
  singleDestinations: SingleDestination[];
  multipleDestinations: MultipleDestinations[];
}
export interface Intinerary {
  id: number;
  name: string;
  destinations: Destinations;
  startDate: string;
  endDate: string;
  status: IntenaryStatus;
  friends: User[];
  organizers: User[];
  user: User;
  budget: number;
  image?: string;
}
