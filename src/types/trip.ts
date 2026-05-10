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
    name?: string;
    amount?: string | number;
    [extra: string]: unknown;
}

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
