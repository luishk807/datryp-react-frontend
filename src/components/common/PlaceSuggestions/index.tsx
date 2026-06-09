import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { buildSuggestionsQuery } from 'api/suggestionsPrefetch';
import RatingBadge from 'components/common/RatingBadge';
import type { PlaceSuggestion } from 'components/common/PlaceAutocomplete';
import type { PlaceRecommendation } from 'types';
import './index.scss';

export interface PlaceSuggestionsProps {
    /** Country to constrain suggestions to. When empty the widget hides
     *  entirely — the recommender needs context to be useful. */
    country?: string;
    /** City the trip is centered on. When provided, the recommender
     *  query asks for top things in `<city>, <country>` instead of
     *  the whole country, so a Boston trip stops surfacing the Statue
     *  of Liberty or the Golden Gate Bridge. The heading also flips
     *  to "Suggested for <city>". */
    city?: string;
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
    /** Whether the strip can be collapsed behind the header chevron.
     *  Defaults to true (the opt-in browsing aid most surfaces keep
     *  tucked away). The Add-Activity wizard passes `false` when the user
     *  has explicitly chosen the "Suggestions" method — there the chips
     *  ARE the point, so the strip stays always-open and the show/hide
     *  chevron is dropped entirely. */
    collapsible?: boolean;
    /** How many suggestions to request. Defaults to a short strip; the
     *  Add-Activity suggestions method asks for a longer top-N list. */
    limit?: number;
    /** Show the "shuffle / refresh" button. Defaults to true. Turned off
     *  where a fixed top-N list is wanted — re-rolling re-fires the
     *  recommender (and re-enriches each place via Google), so dropping it
     *  keeps a one-and-done list cheap. */
    showShuffle?: boolean;
    /** Fires when the user picks a suggestion. The parent prefills name +
     *  location + image from the payload. */
    onPick: (suggestion: PlaceSuggestion) => void;
}

const DEFAULT_LIMIT = 3;

/**
 * Inline recommendation strip shown at the top of the AddPlace form.
 * Pulls the top activities for the user's destination country via the
 * existing `/place-recommendations` endpoint and lets them prefill the
 * form with one tap — name, location, and image all in one go.
 */
const PlaceSuggestions = ({
    country,
    city,
    bias,
    topic = 'top things to do',
    headingPrefix = 'Suggested for',
    collapsible = true,
    limit = DEFAULT_LIMIT,
    showShuffle = true,
    onPick,
}: PlaceSuggestionsProps) => {
    const trimmedCountry = country?.trim();
    const trimmedCity = city?.trim();
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
    // Suggestion scope. The strip narrows to the trip's current city
    // (e.g. the last activity's city — "Jeju") by default, but once it's
    // narrowed the user can't see the broader country picks. This toggle
    // flips between the narrowed city and the whole country ("South
    // Korea") so they can jump back to the country-wide list and return.
    // Only meaningful when we actually have a distinct city + country.
    const canToggleScope =
        !!trimmedCity &&
        !!trimmedCountry &&
        trimmedCity.toLowerCase() !== trimmedCountry.toLowerCase();
    const [scope, setScope] = useState<'city' | 'country'>('city');
    // When the country scope is active (or there's no city to narrow to),
    // drop the city so the heading + recommender query broaden out.
    const effectiveCity =
        canToggleScope && scope === 'country' ? undefined : trimmedCity;
    // The recommender hits OpenAI with this geo string — prefer a
    // city+country pair when known so a Boston trip doesn't keep
    // suggesting the Golden Gate Bridge. Falls back to country-only
    // when we don't have a city yet (or the user broadened the scope).
    const headingScope = effectiveCity || trimmedCountry;
    // Start HIDDEN by default — the panel is opt-in per session via the
    // chevron in the header, with no persistence across openings, so
    // users who don't want it never see it after the first dismiss and
    // users who do can re-expand it any time. When `collapsible` is
    // false the strip is always shown (the chevron is dropped) — used by
    // the Add-Activity "Suggestions" method.
    const [hidden, setHidden] = useState<boolean>(true);
    const isHidden = collapsible ? hidden : false;

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
    const query = buildSuggestionsQuery({
        topic,
        bias,
        country: trimmedCountry,
        city: effectiveCity,
        shuffleNonce,
    });

    const { data, isFetching, isError } = useSearchPlaces(
        trimmedCountry ? query : '',
        limit,
        trimmedCountry,
        // Auto-fired browsing aid — exempt from the free-tier search quota
        // so opening the modal and shuffling never trips the paywall.
        'suggestion',
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
            countryCode: item.countryCode,
            imageUrl: item.imageUrl,
            latitude: item.latitude,
            longitude: item.longitude,
        });
    };

    return (
        <section
            className={classNames('place-suggestions', {
                'is-hidden': isHidden,
            })}
            aria-label={`Suggested places in ${headingScope}`}
        >
            <header className="place-suggestions-head">
                <div className="place-suggestions-head-left">
                    <h4 className="place-suggestions-title">
                        {headingPrefix} {headingScope}
                    </h4>
                    {/* Scope toggle — jump between the narrowed city and the
                        whole country. Label/icon show the OTHER scope (where
                        the tap takes you), so on "Suggested for Jeju" it
                        offers "South Korea", and vice-versa. */}
                    {canToggleScope && (
                        <button
                            type="button"
                            className="place-suggestions-scope"
                            onClick={() => {
                                setScope((s) =>
                                    s === 'city' ? 'country' : 'city',
                                );
                                setPicked(null);
                            }}
                            title={`Show suggestions for ${
                                scope === 'city' ? trimmedCountry : trimmedCity
                            }`}
                        >
                            {scope === 'city' ? (
                                <PublicRoundedIcon fontSize="small" />
                            ) : (
                                <LocationOnRoundedIcon fontSize="small" />
                            )}
                            <span>
                                {scope === 'city'
                                    ? trimmedCountry
                                    : trimmedCity}
                            </span>
                        </button>
                    )}
                </div>
                <div className="place-suggestions-head-actions">
                    {showShuffle && !isHidden && (
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
                    )}
                    {collapsible && (
                        <button
                            type="button"
                            className="place-suggestions-toggle"
                            onClick={() => setHidden((h) => !h)}
                            aria-label={
                                hidden ? 'Show suggestions' : 'Hide suggestions'
                            }
                            aria-expanded={!hidden}
                        >
                            {hidden ? (
                                <ExpandMoreRoundedIcon fontSize="small" />
                            ) : (
                                <ExpandLessRoundedIcon fontSize="small" />
                            )}
                        </button>
                    )}
                </div>
            </header>

            {!isHidden && isError && (
                <p className="place-suggestions-error">
                    Couldn't load suggestions — type a place above instead.
                </p>
            )}

            {!isHidden && !isError && (
                <ul className="place-suggestions-list">
                    {isFetching && items.length === 0
                        ? Array.from({ length: limit }).map((_, idx) => (
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
                                          <a
                                              className="place-suggestions-card-name"
                                              href={buildDetailHref(item)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              aria-label={`Open ${item.name} details in a new tab`}
                                              title={item.name}
                                          >
                                              {item.name}
                                          </a>
                                          <span className="place-suggestions-card-loc">
                                              {item.city}
                                          </span>
                                          <RatingBadge
                                              name={item.name}
                                              location={`${item.city}, ${item.country}`}
                                              variant="chip"
                                          />
                                      </div>
                                      <div className="place-suggestions-actions">
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
