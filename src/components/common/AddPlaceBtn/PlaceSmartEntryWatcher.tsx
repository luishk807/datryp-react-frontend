import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { usePlaceImage } from 'api/hooks/usePlaceImage';
import { usePlaceRating } from 'api/hooks/usePlaceRating';
import { isSearchQuotaExceededError } from 'api/searchQuotaError';
import {
    isShortLinkUrl,
    useResolveShortLink,
} from 'api/hooks/useResolveShortLink';
import { useExtractLink } from 'api/hooks/useExtractLink';
import { useUser } from 'context/UserContext';
import type { PlaceRecommendation } from 'types';
import { parsePlaceEntry, type ParsedPlaceEntry } from './parsePlaceQuery';

/** Canonical-place extras the watcher resolves via Google Places.
 *  Surfaced as a third arg on `onResult` so the parent can override
 *  the AI-recommender's city/country with a real street address when
 *  Google found one. */
export interface SmartEntryExtras {
    formattedAddress?: string;
    placeId?: string;
    /** Pro-upsell line set when a pasted Maps/Yelp link resolved a place
     *  but the street address was withheld because the user is on the
     *  free tier (Google Places = Pro). The caller surfaces it so free
     *  users learn the name + pin came through and Pro unlocks the full
     *  address. Undefined for Pro users or typed (non-URL) input. */
    addressUpsell?: string;
    /** True when this result came from scraping a pasted page's own
     *  schema.org data (a hotel / booking URL), not the recommender or
     *  Google Places. The caller treats it as a trusted, user-pasted
     *  place — skipping the wrong-country guard, since the user pointed
     *  us at this exact page. */
    fromScrape?: boolean;
    /** Global (Google Places) rating + count for the resolved place, set
     *  only when the Google match is trustworthy. The parent persists it
     *  on the activity so the card shows it without a live lookup. */
    googleRating?: number;
    googleRatingCount?: number;
    /** OpenAI/recommender "overall rating" from the trustworthy top match,
     *  persisted on the activity so the card can blend it. */
    openaiRating?: number;
}

/** Pull the country name out of a Google Places `formattedAddress`.
 *  Google puts the country in the LAST comma segment for most locales
 *  ("…, 75007 Paris, France") but FIRST for some — e.g. Japanese
 *  addresses come back as "Japan, 〒100-0005 Tokyo, …, 内", where the
 *  last segment is a stray particle and a naive last-segment grab leaks
 *  an address fragment (or, worse, the whole address) into the country
 *  field. So we pick the last PLAUSIBLE segment — a real word with no
 *  digits (postal codes / street numbers have them) and ≥3 letters
 *  (drops "内"-style fragments) — then fall back to the first. Returns
 *  null when nothing qualifies, so the caller falls back to the trip's
 *  bias country rather than persisting garbage. */
const countryFromAddress = (
    address: string | null | undefined,
): string | null => {
    if (!address) return null;
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    const isCountryLike = (s: string): boolean =>
        !/\d/.test(s) && /\p{L}{3,}/u.test(s);
    const last = parts[parts.length - 1];
    if (isCountryLike(last)) return last;
    const first = parts[0];
    if (isCountryLike(first)) return first;
    return null;
};

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
    const scrapeAppliedRef = useRef<string | null>(null);
    // Pro status drives the street-address upsell on a pasted link: free
    // users get the name + map pin (from the URL's coords, no Google call)
    // but the Google-Places street address is held back behind Pro.
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

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

    // Generic URL scrape: when the input is a URL we couldn't name-extract
    // (i.e. NOT a Google Maps / Yelp link the parser handles directly),
    // ask the backend to read the page's own schema.org JSON-LD for the
    // place + street address. Free — it's the pasted page's structured
    // data, no Google Places call.
    const isHttpUrl = /^https?:\/\//i.test((effectiveInput ?? '').trim());
    const needsScrape = isHttpUrl && parsed?.urlExtractionFailed === true;
    const { data: scraped, isFetching: scrapeFetching } = useExtractLink(
        needsScrape ? (effectiveInput ?? '').trim() : '',
        { enabled: needsScrape },
    );
    // Effective search query: the parsed place name, OR — when a pasted
    // URL couldn't be scraped (bot-blocked brand site like hilton.com) —
    // the slug-derived fallback name so the recommender can still resolve
    // the place (name + city + pin, just not the street address).
    const scrapeSettledEmpty =
        needsScrape && !scrapeFetching && scraped === null;
    const query =
        parsed?.query ||
        (scrapeSettledEmpty ? parsed?.urlSlugFallback ?? '' : '') ||
        '';
    const {
        data: searchData,
        isFetching: searchFetching,
        error: searchError,
    } = useSearchPlaces(query, 1, country);

    // Surface URL-extraction failures AND the over-quota state back to the
    // caller. Cleared whenever a usable parse lands so a stale warning
    // doesn't linger.
    useEffect(() => {
        // Free-tier daily search budget is spent — say so plainly instead
        // of letting smart search go dead and silent (which reads as
        // "broken"). The manual detail fields below still work, so the
        // user can fill name / cost / time and save without the AI assist.
        if (isSearchQuotaExceededError(searchError)) {
            onWarning?.(
                "You've used today's free smart searches. Upgrade to Pro for unlimited — or just fill in the details below and save.",
            );
            return;
        }
        if (!parsed) {
            onWarning?.(null);
            return;
        }
        if (parsed.urlExtractionFailed) {
            // A non-Google/Yelp URL → we try a server-side scrape of the
            // page's own structured data. Hold the failure warning while
            // that's in flight (or succeeded); only surface it once the
            // scrape settles with nothing usable.
            if (needsScrape && (scrapeFetching || scraped)) {
                onWarning?.(null);
                return;
            }
            onWarning?.(
                "We couldn't find a place in that link. Try a Yelp business page, a Google Maps share link, or just type the name.",
            );
            return;
        }
        onWarning?.(null);
        // onWarning identity may change between renders — depending on it
        // would re-fire this effect on every parent re-render. The intent
        // is "react to parsed/search-error state", so deliberately exclude it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed, searchError, needsScrape, scrapeFetching, scraped]);
    // Image fallback for when Google Places has no photo for this venue.
    // Routes through the cache-aware /places/image endpoint (cache →
    // Unsplash → Pexels → Pixabay), which persists the winner so repeat
    // smart entries and other surfaces reuse it without a fresh call. The
    // trip country biases the search (appended server-side) so "Ankole
    // Grill" pulls a relevant photo rather than a stock generic.
    const { data: photoData, isFetching: photoFetching } = usePlaceImage(
        query,
        null,
        country,
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
        // 'all' pulls the star rating + count alongside the address /
        // coords / photo in the SAME searchText call (just a wider field
        // mask — no extra request). We persist that rating snapshot on the
        // activity so the card can show it later without a live lookup.
        'all',
    );

    useEffect(() => {
        onLoadingChange?.(
            shortLinkFetching ||
                searchFetching ||
                photoFetching ||
                ratingFetching ||
                scrapeFetching,
        );
    }, [
        shortLinkFetching,
        searchFetching,
        photoFetching,
        ratingFetching,
        scrapeFetching,
        onLoadingChange,
    ]);

    // Scrape result → ship it straight to the parent as a trusted,
    // user-pasted place. Bypasses the recommender/Google merge below
    // (which never fires here: `parsed.query` is empty for an
    // unrecognized URL, so the searches stay disabled).
    useEffect(() => {
        if (!needsScrape || !scraped) return;
        const name = scraped.name?.trim();
        if (!name) return;
        const parts = [scraped.streetAddress, scraped.city, scraped.region]
            .map((s) => s?.trim())
            .filter((s): s is string => Boolean(s));
        // Append the country only when it's a real name, not a 2-letter
        // ISO code ("PA") — the bare code reads poorly in the address line.
        const countryTrimmed = scraped.country?.trim() ?? '';
        if (countryTrimmed.length > 2) parts.push(countryTrimmed);
        const formattedAddress = parts.join(', ');
        const merged: PlaceRecommendation = {
            name,
            city: scraped.city ?? '',
            country: countryTrimmed,
            countryCode:
                countryTrimmed.length === 2
                    ? countryTrimmed.toUpperCase()
                    : null,
            rating: 0,
            bestTimeToVisit: '',
            description: '',
            imageUrl: scraped.imageUrl ?? null,
            photographerName: null,
            photographerUrl: null,
            latitude: scraped.latitude ?? null,
            longitude: scraped.longitude ?? null,
        };
        const extras: SmartEntryExtras = { fromScrape: true };
        if (formattedAddress) extras.formattedAddress = formattedAddress;
        const key = `${name}|${formattedAddress}|${merged.imageUrl ?? ''}`;
        if (scrapeAppliedRef.current === key) return;
        scrapeAppliedRef.current = key;
        onResult(merged, parsed ?? { query: name }, extras);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsScrape, scraped]);

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
        const queryTokens = query
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
            //
            // Country: parse from the last comma segment of the
            // formattedAddress. Falling back to the bias country was
            // a bug — it let foreign landmarks like Mount Fuji slip
            // through the parent's `sameCountry` check because the
            // merged result claimed to be in the trip country.
            merged = {
                name: ratingData?.name ?? query,
                // We don't get city/country from Google directly, but
                // the formattedAddress carries the same info plus the
                // full street. Leave city blank so the parent's
                // location-string builder uses the address below.
                city: '',
                country:
                    countryFromAddress(ratingData?.formattedAddress) ??
                    country ??
                    '',
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
        } else if (query) {
            // Bare synthetic: neither backend matched the user's
            // query. We still ship the typed name + (maybe) a photo
            // so the user has something to save and edit. Crucially
            // we do NOT leak ratingData's address / coords here —
            // they belong to a different place that happened to share
            // a city / country with the user's input.
            merged = {
                name: query,
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
        // Pasted Google Maps links carry the place pin right in the URL.
        // Layer those coords on whenever the name-/coord-based search
        // didn't already supply them — this is free (no Google Places)
        // so it geo-pins the activity even on the free tier.
        if (parsed.latitude != null && merged.latitude == null) {
            merged = { ...merged, latitude: parsed.latitude };
        }
        if (parsed.longitude != null && merged.longitude == null) {
            merged = { ...merged, longitude: parsed.longitude };
        }
        const extras: SmartEntryExtras = {};
        if (ratingTrustworthy && ratingData?.formattedAddress) {
            extras.formattedAddress = ratingData.formattedAddress;
        }
        if (ratingTrustworthy && ratingData?.placeId) {
            extras.placeId = ratingData.placeId;
        }
        // Persist the global rating snapshot when Google matched this
        // place — the create flow stashes it on the activity so the card
        // shows it without a live lookup.
        if (ratingTrustworthy && ratingData?.rating != null) {
            extras.googleRating = ratingData.rating;
            if (ratingData.userRatingCount != null) {
                extras.googleRatingCount = ratingData.userRatingCount;
            }
        }
        // The OpenAI/recommender "overall rating" rides on the AI top
        // match — capture it only when that match is the one we trust
        // (its rating is meaningless when we fell back to a Google-only
        // or bare-synthetic result, where `top` was rejected or absent).
        if (top && topTrustworthy && top.rating != null && top.rating > 0) {
            extras.openaiRating = top.rating;
        }
        // Free-tier upsell: a deliberately-pasted link resolved a real
        // place, but the street address comes from Google Places (Pro).
        // We still filled the name + map pin above; nudge the user toward
        // Pro for the exact address instead of failing silently.
        if (parsed.fromUrl && !isPro && !extras.formattedAddress) {
            extras.addressUpsell =
                'Added the name and pinned it on the map. Auto-filling the exact street address is a Pro feature.';
        }
        const key = `${query}|${merged.name}|${merged.imageUrl ?? ''}|${extras.formattedAddress ?? ''}`;
        if (appliedRef.current === key) return;
        appliedRef.current = key;
        onResult(merged, parsed, extras);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        searchData,
        photoData,
        ratingData,
        parsed,
        query,
        searchFetching,
        photoFetching,
        ratingFetching,
        country,
        isPro,
    ]);

    return null;
};

export default PlaceSmartEntryWatcher;
