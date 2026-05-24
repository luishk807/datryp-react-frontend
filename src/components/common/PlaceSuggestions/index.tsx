import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import type { PlaceSuggestion } from 'components/common/PlaceAutocomplete';
import type { PlaceRecommendation } from 'types';
import './index.scss';

export interface PlaceSuggestionsProps {
    /** Country to constrain suggestions to. When empty the widget hides
     *  entirely — the recommender needs context to be useful. */
    country?: string;
    /** Optional bias term — e.g. an arrival airport code, last visited
     *  city, or activity-type hint. Appended to the recommender query so
     *  results lean toward the user's current trip context. */
    bias?: string;
    /** Topic seed for the recommender query. Defaults to "top things to
     *  do", which surfaces attractions / activities. Override for kind-
     *  specific suggestions — e.g. `"top hotels"` for the hotel form,
     *  `"top restaurants"` for a food form. The string is dropped
     *  straight into the OpenAI prompt, so phrase it as you'd ask. */
    topic?: string;
    /** Heading shown above the chips. Defaults to "Suggested for X". */
    headingPrefix?: string;
    /** Fires when the user picks a suggestion. The parent prefills name +
     *  location + image from the payload. */
    onPick: (suggestion: PlaceSuggestion) => void;
}

const LIMIT = 3;

/**
 * Inline 3-card recommendation strip shown at the top of the AddPlace
 * form. Pulls the top activities for the user's destination country via
 * the existing `/place-recommendations` endpoint and lets them prefill
 * the form with one tap — name, location, and image all in one go.
 */
const PlaceSuggestions = ({
    country,
    bias,
    topic = 'top things to do',
    headingPrefix = 'Suggested for',
    onPick,
}: PlaceSuggestionsProps) => {
    const trimmedCountry = country?.trim();
    // Picker is rendered inside the trip editor — read the trip id off
    // the URL so the per-card "View" link carries it into /place. A new
    // /place tab with the trip id lets "Add to itinerary" persist
    // straight back to this trip.
    const [searchParams] = useSearchParams();
    const tripId = searchParams.get('id');
    // Cache-bust nonce — bumped when the user hits "shuffle" so the
    // recommender returns a fresh set instead of the cached top-3.
    const [shuffleNonce, setShuffleNonce] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);

    // `q=<name>&i=0` matches the convention used by Saved / Visited /
    // NearbyGrid. The recommender chokes on verbose
    // `name, city, country` strings (especially when the country name
    // carries an ISO 3166 parenthetical suffix like
    // "United States Minor Outlying Islands (the)" — those produce a
    // 500 from /place-details).
    const buildDetailHref = (item: PlaceRecommendation): string => {
        const params = new URLSearchParams({ q: item.name, i: '0' });
        if (tripId) params.set('id', tripId);
        return `/place?${params.toString()}`;
    };

    // Build a query that biases the recommender toward the configured
    // topic (defaults to "top things to do" for activities; the hotel
    // form passes "top hotels" instead). Adding the optional `bias`
    // term (e.g. arrival airport / city) narrows further. Empty
    // country means no useful query, so we skip the call entirely.
    const queryParts = [
        topic,
        bias?.trim() || '',
        trimmedCountry ? `in ${trimmedCountry}` : '',
        shuffleNonce ? `(shuffle ${shuffleNonce})` : '',
    ].filter(Boolean);
    const query = queryParts.join(' ');

    const { data, isFetching, isError } = useSearchPlaces(
        trimmedCountry ? query : '',
        LIMIT,
        trimmedCountry,
    );

    if (!trimmedCountry) return null;

    const items: PlaceRecommendation[] = data?.items ?? [];

    const handlePick = (item: PlaceRecommendation) => {
        setPicked(item.name);
        onPick({
            name: item.name,
            location: `${item.city}, ${item.country}`,
            city: item.city,
            country: item.country,
            imageUrl: item.imageUrl,
        });
    };

    return (
        <section
            className="place-suggestions"
            aria-label={`Suggested places in ${trimmedCountry}`}
        >
            <header className="place-suggestions-head">
                <h4 className="place-suggestions-title">
                    {headingPrefix} {trimmedCountry}
                </h4>
                <button
                    type="button"
                    className="place-suggestions-shuffle"
                    onClick={() => {
                        setShuffleNonce((n) => n + 1);
                        setPicked(null);
                    }}
                    aria-label="Refresh suggestions"
                    disabled={isFetching}
                >
                    <RefreshRoundedIcon fontSize="small" />
                </button>
            </header>

            {isError && (
                <p className="place-suggestions-error">
                    Couldn't load suggestions — type a place above instead.
                </p>
            )}

            {!isError && (
                <ul className="place-suggestions-list">
                    {isFetching && items.length === 0
                        ? Array.from({ length: LIMIT }).map((_, idx) => (
                              <li
                                  key={`skeleton-${idx}`}
                                  className="place-suggestions-card is-skeleton"
                                  aria-hidden="true"
                              >
                                  <span className="place-suggestions-thumb is-placeholder" />
                                  <span className="place-suggestions-card-body">
                                      <span className="place-suggestions-card-name skeleton-line" />
                                      <span className="place-suggestions-card-loc skeleton-line short" />
                                  </span>
                              </li>
                          ))
                        : items.map((item) => {
                              const isPicked = picked === item.name;
                              return (
                                  <li
                                      key={`${item.name}-${item.city}`}
                                      className={
                                          'place-suggestions-card' +
                                          (isPicked ? ' is-picked' : '')
                                      }
                                  >
                                      {item.imageUrl ? (
                                          <img
                                              className="place-suggestions-thumb"
                                              src={item.imageUrl}
                                              alt=""
                                              loading="lazy"
                                          />
                                      ) : (
                                          <span className="place-suggestions-thumb is-placeholder">
                                              <LocationOnRoundedIcon fontSize="small" />
                                          </span>
                                      )}
                                      <div className="place-suggestions-card-body">
                                          <span className="place-suggestions-card-name">
                                              {item.name}
                                          </span>
                                          <span className="place-suggestions-card-loc">
                                              {item.city}
                                          </span>
                                      </div>
                                      <div className="place-suggestions-actions">
                                          <a
                                              className="place-suggestions-view"
                                              href={buildDetailHref(item)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              aria-label={`Open ${item.name} details in a new tab`}
                                              title="View details"
                                          >
                                              <OpenInNewRoundedIcon fontSize="small" />
                                              <span>View</span>
                                          </a>
                                          <button
                                              type="button"
                                              className="place-suggestions-add"
                                              onClick={() => handlePick(item)}
                                              aria-label={`Use ${item.name}`}
                                              disabled={isPicked}
                                          >
                                              {isPicked ? (
                                                  'Added'
                                              ) : (
                                                  <>
                                                      <AddCircleOutlineRoundedIcon fontSize="small" />
                                                      <span>Add</span>
                                                  </>
                                              )}
                                          </button>
                                      </div>
                                  </li>
                              );
                          })}
                </ul>
            )}
        </section>
    );
};

export default PlaceSuggestions;
