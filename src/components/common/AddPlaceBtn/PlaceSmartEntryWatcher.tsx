import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { usePhotoSearch } from 'api/hooks/usePhotoSearch';
import { usePlaceRating } from 'api/hooks/usePlaceRating';
import {
    isShortLinkUrl,
    useResolveShortLink,
} from 'api/hooks/useResolveShortLink';
import type { PlaceRecommendation } from 'types';
import { parsePlaceEntry, type ParsedPlaceEntry } from './parsePlaceQuery';

/** Canonical-place extras the watcher resolves via Google Places.
 *  Surfaced as a third arg on `onResult` so the parent can override
 *  the AI-recommender's city/country with a real street address when
 *  Google found one. */
export interface SmartEntryExtras {
    formattedAddress?: string;
    placeId?: string;
}

interface PlaceSmartEntryWatcherProps {
    /** Free text the user typed into the smart-entry field — may be a
     *  plain place name ("Eiffel Tower"), a Google Maps share URL,
     *  or a sentence like "Ankole Grill at 10am-12pm, around $50". */
    rawInput?: string;
    /** Country bias passed through to the search backend so the top
     *  match is anchored to the user's destination. Required for the
     *  smart entry — without it, "Eiffel Tower" could return matches
     *  from anywhere. */
    country?: string;
    /** Fires when the search lands a usable hit. The `parsed` payload
     *  carries any times / cost the user typed in the same sentence
     *  so the parent can apply them in one shot. `item` may be a real
     *  AI recommendation OR a synthetic fallback built from a photo-
     *  search match (when no recommendation exists for the query — a
     *  specific restaurant name, an obscure venue, etc.). */
    onResult: (
        item: PlaceRecommendation,
        parsed: ParsedPlaceEntry,
        extras?: SmartEntryExtras,
    ) => void;
    onLoadingChange?: (loading: boolean) => void;
    /** Soft warning the caller should surface inline (e.g. "couldn't
     *  read that URL"). `null` clears any previous warning. The
     *  watcher manages its own warnings; the caller can layer
     *  additional ones (like country mismatch) on top in its
     *  `onResult` handler. */
    onWarning?: (text: string | null) => void;
}

/**
 * Headless companion to the place smart-entry textfield. Mirrors the
 * flight watcher: debounces input, runs a search, and pushes the top
 * result back to the parent. Two search layers under the hood:
 *
 *   1. `/place-recommendations` — AI recommendation engine. Great for
 *      "Eiffel Tower" / "Mount Fuji" — known attractions with full
 *      metadata (location, lat/lng, image).
 *   2. `/photo-search` — Unsplash fallback. Picks up specific names
 *      ("Ankole Grill", "Joe's Diner") that the recommendation
 *      engine doesn't know about. Returns at least an image so the
 *      activity card has a hero.
 *
 * The watcher fires both in parallel and merges: prefer (1) when it
 * hits, fall back to a synthetic record from (2) when (1) returns
 * nothing. Either way the parent gets `name` + `image_url` filled.
 */
const PlaceSmartEntryWatcher = ({
    rawInput,
    country,
    onResult,
    onLoadingChange,
    onWarning,
}: PlaceSmartEntryWatcherProps) => {
    const [parsed, setParsed] = useState<ParsedPlaceEntry | null>(null);
    const appliedRef = useRef<string | null>(null);

    // Short-link unwrap: `maps.app.goo.gl/...` URLs are opaque and
    // need a backend redirect-follow before we can extract a place.
    // The hook returns null until the resolve lands; the resolve is
    // cached for 24h so re-pastes are instant.
    const isShort = useMemo(
        () => isShortLinkUrl((rawInput ?? '').trim()),
        [rawInput],
    );
    const { data: resolvedShortUrl, isFetching: shortLinkFetching } =
        useResolveShortLink((rawInput ?? '').trim(), { enabled: isShort });
    // Once a short link resolves, route the resolved URL through the
    // existing parser. If it didn't resolve yet, sit on a null parse
    // (no search fires) — the loading indicator covers the wait.
    const effectiveInput = useMemo(() => {
        if (!isShort) return rawInput;
        return resolvedShortUrl ?? '';
    }, [isShort, resolvedShortUrl, rawInput]);

    useEffect(() => {
        // 1200ms (was 600ms): a place sentence with time + cost takes
        // a beat to type — "bocas del toro from 2pm - 5pm with a cost
        // of 20 dollars" is ~50 chars and users often pause mid-cost
        // to remember the number. A short debounce fired the parser
        // before the cost was typed, which then over-stripped the
        // residual into a wrong name. The post-parse search itself
        // still debounces on the query string downstream, so this only
        // delays the moment the watcher commits a parsed result.
        const timer = setTimeout(() => {
            setParsed(parsePlaceEntry(effectiveInput));
        }, 1200);
        return () => clearTimeout(timer);
    }, [effectiveInput]);

    // Surface URL-extraction failures back to the caller. Cleared
    // whenever a usable parse lands (empty / plain text / URL with a
    // resolved name) so a stale warning doesn't linger.
    useEffect(() => {
        if (!parsed) {
            onWarning?.(null);
            return;
        }
        if (parsed.urlExtractionFailed) {
            onWarning?.(
                "We couldn't find a place in that link. Try a Yelp business page, a Google Maps share link, or just type the name.",
            );
            return;
        }
        onWarning?.(null);
        // onWarning identity may change between renders — depending on
        // it would re-fire this effect on every parent re-render. The
        // intent is "react to parsed state", so deliberately exclude it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed]);

    const query = parsed?.query ?? '';
    const { data: searchData, isFetching: searchFetching } = useSearchPlaces(
        query,
        1,
        country,
    );
    // Bias the photo query toward the trip's country so "Ankole Grill"
    // pulls a relevant photo (the restaurant in Tokyo, say) rather than
    // a stock generic.
    const photoQuery = country ? `${query} ${country}` : query;
    const { data: photoData, isFetching: photoFetching } = usePhotoSearch(
        photoQuery,
        { enabled: Boolean(query) },
    );
    // Google Places resolves the actual street address + coordinates
    // for arbitrary names (hotels, restaurants) that the AI
    // recommender doesn't know about. Same `country` bias as the
    // photo query — the backend appends it to the search.
    const { data: ratingData, isFetching: ratingFetching } = usePlaceRating(
        query,
        country,
        Boolean(query),
    );

    useEffect(() => {
        onLoadingChange?.(
            shortLinkFetching ||
                searchFetching ||
                photoFetching ||
                ratingFetching,
        );
    }, [
        shortLinkFetching,
        searchFetching,
        photoFetching,
        ratingFetching,
        onLoadingChange,
    ]);

    useEffect(() => {
        if (!parsed) return;
        // Wait for all three legs to settle so the merged result
        // always ships with an image (when one exists) and Google's
        // real address (when found). TanStack returns isFetching=false
        // on cache hit, so the wait is short for repeat queries.
        if (searchFetching || photoFetching || ratingFetching) return;
        const top = searchData?.items?.[0];
        // Distinctive-token check: both backends (AI recommender and
        // Google Places) occasionally return a popular-in-country
        // place when they can't find the user's actual query — e.g.
        // searching "tokyo skytree" returns "Rokurinsha Tokyo Ramen
        // Street" because both names share "tokyo". A simple any-
        // token overlap accepts that as a hit; we need all
        // distinctive (≥4 char, so stopwords like "the"/"and"
        // drop out) tokens in the user's query to appear in the
        // result name, or we treat the backend as having missed.
        const queryTokens = parsed.query
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter((t) => t.length >= 4);
        const nameMatchesQuery = (name: string | null | undefined): boolean => {
            if (queryTokens.length === 0) return true;
            if (!name) return false;
            const lowered = name.toLowerCase();
            return queryTokens.every((t) => lowered.includes(t));
        };
        const topTrustworthy = top ? nameMatchesQuery(top.name) : false;
        // Coordinate fallback: a single place often has multiple
        // legitimate names — e.g. "Hiroshima Peace Memorial (Atomic
        // Bomb Dome)" (AI) vs. "Atomic Bomb Dome" (Google's short
        // label). The name-token check rejects the Google match,
        // which then strips its address / photo / coords from the
        // result even though it's the same building. When the AI
        // result IS trustworthy AND Google's lat/lng land within
        // ~100m of the AI's, treat Google as the same place under
        // an alternate label.
        const coordsAgreeWithTop = (() => {
            if (!topTrustworthy || !top) return false;
            if (top.latitude == null || top.longitude == null) return false;
            if (ratingData?.latitude == null || ratingData?.longitude == null) {
                return false;
            }
            const latDiff = Math.abs(top.latitude - ratingData.latitude);
            const lngDiff = Math.abs(top.longitude - ratingData.longitude);
            return latDiff < 0.001 && lngDiff < 0.001;
        })();
        const ratingTrustworthy =
            nameMatchesQuery(ratingData?.name) || coordsAgreeWithTop;
        // Image priority:
        //   1. Google Places photo (real business photo — works for
        //      niche / local / non-English-named venues that Unsplash
        //      doesn't cover) — but ONLY when ratingData's name
        //      matches the query. Without this gate, a stale-cache
        //      Rokurinsha rating leaks its interior photo onto a
        //      Mount-Fuji query even though we reject the name.
        //   2. Unsplash search match (generic landscape / cityscape
        //      fallback when Google has no photo, or when we don't
        //      trust the Google match).
        const photoUrl =
            (ratingTrustworthy ? ratingData?.photoUrl : undefined) ??
            photoData?.imageUrl ??
            null;
        let merged: PlaceRecommendation | null = null;
        if (top && topTrustworthy) {
            // Real recommendation hit. Use the photo-search image as
            // a fallback only when the recommendation itself doesn't
            // carry one.
            merged = {
                ...top,
                imageUrl: top.imageUrl ?? photoUrl,
                photographerName:
                    top.photographerName ?? photoData?.photographerName ?? null,
                photographerUrl:
                    top.photographerUrl ?? photoData?.photographerUrl ?? null,
            };
        } else if (ratingTrustworthy && (ratingData?.formattedAddress || photoUrl)) {
            // Google Places matched the query — use its address /
            // coords / name. `formatted_address` is the real street
            // address ("Champ de Mars, 5 Av. Anatole France, 75007
            // Paris, France") instead of just "Paris, France".
            merged = {
                name: ratingData?.name ?? parsed.query,
                // We don't get city/country from Google directly, but
                // the formattedAddress carries the same info plus the
                // full street. Leave city blank so the parent's
                // location-string builder uses the address below.
                city: '',
                country: country ?? '',
                countryCode: null,
                rating: ratingData?.rating ?? 0,
                bestTimeToVisit: '',
                description: '',
                imageUrl: photoUrl,
                photographerName: photoData?.photographerName ?? null,
                photographerUrl: photoData?.photographerUrl ?? null,
                latitude: ratingData?.latitude ?? null,
                longitude: ratingData?.longitude ?? null,
            };
        } else if (parsed.query) {
            // Bare synthetic: neither backend matched the user's
            // query. We still ship the typed name + (maybe) a photo
            // so the user has something to save and edit. Crucially
            // we do NOT leak ratingData's address / coords here —
            // they belong to a different place that happened to share
            // a city / country with the user's input.
            merged = {
                name: parsed.query,
                city: '',
                country: country ?? '',
                countryCode: null,
                rating: 0,
                bestTimeToVisit: '',
                description: '',
                imageUrl: photoUrl,
                photographerName: photoData?.photographerName ?? null,
                photographerUrl: photoData?.photographerUrl ?? null,
                latitude: null,
                longitude: null,
            };
        }
        if (!merged) return;
        // Layer Google's real coordinates on top only when the
        // rating result was trustworthy (see above). Without this
        // gate the bare-synthetic path inherits the wrong place's
        // lat/lng.
        if (ratingTrustworthy && ratingData?.latitude != null && !merged.latitude) {
            merged = { ...merged, latitude: ratingData.latitude };
        }
        if (ratingTrustworthy && ratingData?.longitude != null && !merged.longitude) {
            merged = { ...merged, longitude: ratingData.longitude };
        }
        const extras: SmartEntryExtras = {};
        if (ratingTrustworthy && ratingData?.formattedAddress) {
            extras.formattedAddress = ratingData.formattedAddress;
        }
        if (ratingTrustworthy && ratingData?.placeId) {
            extras.placeId = ratingData.placeId;
        }
        const key = `${parsed.query}|${merged.name}|${merged.imageUrl ?? ''}|${extras.formattedAddress ?? ''}`;
        if (appliedRef.current === key) return;
        appliedRef.current = key;
        onResult(merged, parsed, extras);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        searchData,
        photoData,
        ratingData,
        parsed,
        searchFetching,
        photoFetching,
        ratingFetching,
        country,
    ]);

    return null;
};

export default PlaceSmartEntryWatcher;
