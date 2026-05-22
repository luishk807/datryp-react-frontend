/** Trimmed place fields needed to render a share email. Mirrors backend
 *  `SharePlacePayload`. `description` may be empty — city / country
 *  shares don't have a tagline. */
export interface SharePlacePayload {
  name: string;
  city: string;
  country: string;
  description: string;
  image_url: string | null;
}

/** Request body for POST /share/email. `to` is a list so a single
 *  request can fan out to multiple recipients. Frontend trims + dedups
 *  + per-address-validates before submit. */
export interface ShareEmailRequest {
  to: string[];
  place: SharePlacePayload;
  search_url: string;
  sender_name?: string | null;
  personal_message?: string | null;
}
