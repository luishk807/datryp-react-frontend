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
