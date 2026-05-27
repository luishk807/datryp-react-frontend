import { useEffect, useRef, useState } from 'react';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { usePhotoSearch } from 'api/hooks/usePhotoSearch';
import type { PlaceRecommendation } from 'types';
import { parsePlaceEntry, type ParsedPlaceEntry } from './parsePlaceQuery';

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
    ) => void;
    onLoadingChange?: (loading: boolean) => void;
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
}: PlaceSmartEntryWatcherProps) => {
    const [parsed, setParsed] = useState<ParsedPlaceEntry | null>(null);
    const appliedRef = useRef<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setParsed(parsePlaceEntry(rawInput));
        }, 600);
        return () => clearTimeout(timer);
    }, [rawInput]);

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

    useEffect(() => {
        onLoadingChange?.(searchFetching || photoFetching);
    }, [searchFetching, photoFetching, onLoadingChange]);

    useEffect(() => {
        if (!parsed) return;
        // Wait for BOTH legs to settle so the merged result always
        // ships with an image when one is available. (TanStack returns
        // isFetching=false on cache hit too, so the wait is short.)
        if (searchFetching || photoFetching) return;
        const top = searchData?.items?.[0];
        const photoUrl = photoData?.imageUrl ?? null;
        let merged: PlaceRecommendation | null = null;
        if (top) {
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
        } else if (photoUrl) {
            // No recommendation match — fall back to a synthetic record
            // built from the parsed query + the Unsplash photo. Country
            // / lat / lng land as null; the user fills those manually
            // in the collapsed details if they care.
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
        const key = `${parsed.query}|${merged.name}|${merged.imageUrl ?? ''}`;
        if (appliedRef.current === key) return;
        appliedRef.current = key;
        onResult(merged, parsed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchData, photoData, parsed, searchFetching, photoFetching, country]);

    return null;
};

export default PlaceSmartEntryWatcher;
