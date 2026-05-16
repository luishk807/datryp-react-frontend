/** Trimmed place fields needed to render a share email. Mirrors backend
 *  `SharePlacePayload`. */
export interface SharePlacePayload {
  name: string;
  city: string;
  country: string;
  description: string;
  image_url: string | null;
}

/** Request body for POST /share/email. */
export interface ShareEmailRequest {
  to: string;
  place: SharePlacePayload;
  search_url: string;
  sender_name?: string | null;
  personal_message?: string | null;
}
