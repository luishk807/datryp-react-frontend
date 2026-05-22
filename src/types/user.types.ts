import type { Country } from "./common.types";

export interface Gender {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  dob: string;
  countryOfBirth: Country;
  gender: Gender;
}
