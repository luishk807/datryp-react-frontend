/**
 * `/preparing-trip` — transient loading screen shown while the
 * "Plan trip with these picks" CTA on /country resolves each
 * highlight title into a real place (name + address + photo) and
 * dispatches the resulting activity into TripContext.
 *
 * The CTA used to do all this synchronously on /country: button text
 * flipped to "Finding the best spots…" while 4-12 backend calls fired
 * and the user sat staring at the country page wondering whether
 * anything was happening. Routing through a dedicated page makes the
 * wait its own moment — full-bleed spinner, a live progress counter,
 * and the name of the place currently being resolved — instead of
 * masking a meaningful pause behind a disabled button.
 *
 * Inputs arrive via `useLocation().state` (set by the CTA in
 * CountryDetail). Direct navigation with no state bounces back to /,
 * since this page is purely a pipeline step.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import Layout from 'components/common/Layout';
import { fetchPlaceRecommendations } from 'api/placeRecommendationsApi';
import { addPlace, useTripDispatch } from 'context/TripContext';
import { ACTIVITY_KIND } from 'constants';
import './index.scss';

interface SeedHighlight {
    title: string;
    description: string;
}

interface PreparingTripState {
    /** Where to send the user once the enrichment finishes. Always the
     *  trip-builder route (`/single` or `/multiple`). */
    targetRoute: string;
    /** ISO date string used as the seed day for every dispatched
     *  activity. */
    today: string;
    country: {
        id: string;
        name: string;
        code: string;
        local: string | null;
        image: string | null;
    };
    /** "<city>, <country>" — used when a highlight's recommender call
     *  returns no item at all, so we still write a usable location. */
    fallbackLocation: string;
    highlights: SeedHighlight[];
}

/** Drop common verb-prefixes the OpenAI prompt likes to attach
 *  ("Visit Belem Tower", "Explore Alfama district") before sending the
 *  title to the recommender. The recommender + Unsplash search both do
 *  literal string matching, and these prefixes consistently make
 *  good landmarks miss — exactly the scenario we hit with
 *  "Castelo de São Jorge". */
const PREFIX_RE =
    /^(?:visit|explore|discover|see|tour|experience|wander\s+through|stroll\s+through|take\s+a\s+trip\s+to|enjoy|stroll|walk\s+through|head\s+to)\s+/i;
const stripActionPrefix = (s: string): string => s.replace(PREFIX_RE, '').trim();

/** Diacritics-folded variant for a final Unsplash retry. Some Portuguese
 *  / Spanish landmarks index better without accents (São → Sao). */
const stripDiacritics = (s: string): string =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Build the ordered list of query variants we'll try for one
 *  highlight. The first item with an imageUrl wins. Each subsequent
 *  variant is strictly broader than the previous, mirroring what a
 *  human would type if their first guess returned nothing. */
const buildQueryVariants = (rawTitle: string): string[] => {
    const stripped = stripActionPrefix(rawTitle);
    const noAccents = stripDiacritics(stripped);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of [rawTitle, stripped, noAccents]) {
        const key = v.trim().toLowerCase();
        if (key && !seen.has(key)) {
            seen.add(key);
            out.push(v.trim());
        }
    }
    return out;
};

interface Progress {
    /** 1-indexed — "Looking up activity N of M". */
    current: number;
    total: number;
    /** Current highlight title; surfaced under the spinner so the user
     *  sees the work moving. */
    label: string;
}

const PreparingTrip = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useTripDispatch();
    const state = location.state as PreparingTripState | null;

    const [progress, setProgress] = useState<Progress>({
        current: 0,
        total: state?.highlights.length ?? 0,
        label: '',
    });
    // Tracks "this useEffect has fired its async work already" so
    // React 18's strict-mode double-invoke doesn't dispatch every
    // highlight twice on dev.
    const startedRef = useRef(false);

    useEffect(() => {
        if (!state) {
            // Direct navigation / refresh — no seed payload to act on.
            // Bounce home rather than sit on a half-rendered loading
            // shell.
            navigate('/', { replace: true });
            return;
        }
        // React 18 StrictMode mounts effects twice in dev (mount →
        // cleanup → re-mount). The ref guard makes sure we only kick
        // off the async pipeline once. We deliberately do NOT install
        // a `cancelled = true` cleanup — pairing that with this guard
        // would: first mount kicks off work, cleanup cancels it,
        // second mount skips because ref is set, page hangs forever.
        // Dispatches into TripContext are persisted to localStorage
        // and the final `navigate(replace: true)` is idempotent, so
        // running to completion after a transient unmount is fine.
        if (startedRef.current) return;
        startedRef.current = true;

        void (async () => {
            const { country, highlights, fallbackLocation, today, targetRoute } =
                state;
            const countryFallbackImage = country.image ?? undefined;

            for (let i = 0; i < highlights.length; i += 1) {
                const h = highlights[i];
                setProgress({
                    current: i + 1,
                    total: highlights.length,
                    label: h.title,
                });

                let resolvedName = h.title;
                let location = fallbackLocation;
                let imageUrl: string | undefined = undefined;
                let resolvedCity: string | undefined = undefined;

                // Pass set A — country-scoped, multiple query variants.
                // We try the raw title first, then the action-prefix
                // stripped form ("Visit Belém Tower" → "Belém Tower"),
                // then the diacritics-folded form. First variant whose
                // top result carries an image wins. We always capture
                // the resolved name/city/location from the FIRST
                // successful response even if it has no image, so the
                // activity still gets a real address from the
                // recommender rather than the bare country fallback.
                const variants = buildQueryVariants(h.title);
                for (const q of variants) {
                    try {
                        const result = await fetchPlaceRecommendations(
                            q,
                            1,
                            country.name,
                        );
                        const top = result.items[0];
                        if (top) {
                            if (!resolvedCity) {
                                // Lock the resolved metadata to the first
                                // variant that returned anything at all.
                                resolvedName = top.name || h.title;
                                location = `${top.city}, ${top.country}`;
                                resolvedCity = top.city;
                            }
                            if (top.imageUrl) {
                                imageUrl = top.imageUrl;
                                break;
                            }
                        }
                    } catch {
                        // Try next variant.
                    }
                }

                // Pass B — global (no country scope). Sometimes the
                // recommender's country-scoped path is narrower than
                // its global path; running the original title with
                // no scope is what the user effectively does when
                // they manually re-search in the activity edit modal.
                if (!imageUrl) {
                    try {
                        const result = await fetchPlaceRecommendations(
                            stripActionPrefix(h.title),
                            1,
                        );
                        const top = result.items[0];
                        if (top?.imageUrl) {
                            imageUrl = top.imageUrl;
                            if (!resolvedCity) {
                                resolvedName = top.name || h.title;
                                location = `${top.city}, ${top.country}`;
                                resolvedCity = top.city;
                            }
                        }
                    } catch {
                        // best-effort.
                    }
                }

                // Pass C — city-only fallback. Worst case the activity
                // gets a thematic city photo instead of a generic
                // country hero, which still reads as plausible.
                if (!imageUrl && resolvedCity) {
                    try {
                        const cityResult = await fetchPlaceRecommendations(
                            resolvedCity,
                            1,
                            country.name,
                        );
                        const top = cityResult.items[0];
                        if (top?.imageUrl) imageUrl = top.imageUrl;
                    } catch {
                        // best-effort.
                    }
                }

                // Pass D — country hero image so no card lands empty.
                if (!imageUrl) imageUrl = countryFallbackImage;

                dispatch(
                    addPlace({
                        value: {
                            kind: ACTIVITY_KIND.PLACE,
                            name: resolvedName,
                            note: h.description,
                            location,
                            image: imageUrl
                                ? { url: imageUrl, name: resolvedName }
                                : undefined,
                        },
                        index: 0,
                        date: today,
                        destinationIndx: 0,
                    }),
                );
            }

            // Land on the trip-builder. Replace so the back button
            // skips this loading page entirely (back from /single
            // goes to /country, not /preparing-trip).
            navigate(targetRoute, { replace: true });
        })();
        // Intentionally only on mount — the seed payload doesn't
        // change mid-flight.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!state) {
        return null;
    }

    const pct =
        progress.total > 0
            ? Math.round((progress.current / progress.total) * 100)
            : 0;

    return (
        <Layout>
            <div className="preparing-trip">
                <div className="preparing-trip-card">
                    <div
                        className="preparing-trip-spinner"
                        aria-hidden="true"
                    />
                    <div className="preparing-trip-eyebrow">
                        <AutoAwesomeRoundedIcon fontSize="small" />
                        <span>Curating your itinerary</span>
                    </div>
                    <h1 className="preparing-trip-title">
                        Finding the best spots in {state.country.name}
                    </h1>
                    <p className="preparing-trip-subtitle">
                        We're pulling photos and addresses for each suggested
                        activity so your day-one plan is ready to go.
                    </p>

                    <div
                        className="preparing-trip-progress-track"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div
                            className="preparing-trip-progress-fill"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="preparing-trip-progress-text">
                        {progress.current === 0
                            ? 'Getting started…'
                            : progress.label
                              ? `Resolving “${progress.label}”…`
                              : 'Finishing up…'}
                        {progress.total > 0 && (
                            <span className="preparing-trip-progress-count">
                                {' '}
                                ({progress.current} of {progress.total})
                            </span>
                        )}
                    </p>

                    <ul
                        className="preparing-trip-steps"
                        aria-label="Itinerary preparation steps"
                    >
                        {state.highlights.map((h, idx) => {
                            const status =
                                idx + 1 < progress.current
                                    ? 'done'
                                    : idx + 1 === progress.current
                                      ? 'active'
                                      : 'queued';
                            return (
                                <li
                                    key={h.title}
                                    className={`preparing-trip-step is-${status}`}
                                >
                                    <span className="preparing-trip-step-icon">
                                        {status === 'done' ? (
                                            <CheckCircleRoundedIcon fontSize="small" />
                                        ) : status === 'active' ? (
                                            <span className="preparing-trip-step-dot" />
                                        ) : null}
                                    </span>
                                    <span className="preparing-trip-step-label">
                                        {h.title}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </Layout>
    );
};

export default PreparingTrip;
