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
  /** Public avatar URL (from the GraphQL UserPublic). Optional — null
   *  when the user hasn't uploaded one; consumers fall back to initials. */
  profileImageUrl?: string | null;
}
