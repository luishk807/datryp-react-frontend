import type { Country } from "./common.types";

export interface Gender {
  id: number;
  name: string;
}

export interface User {
  id: number;
  /** Backend user UUID (string). The adapter sets this alongside the
   *  numeric `id`; used to match against the logged-in user's id. */
  userId?: string;
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
