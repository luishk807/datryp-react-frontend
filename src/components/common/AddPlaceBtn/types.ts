import type { Dispatch, SetStateAction } from 'react';
import type {
    ActivityKind,
    FlightInfo,
    Friend,
    ImageRef,
    TransitInfo,
} from 'types';
import type { FlightLookupResult } from 'api/flightLookupApi';
import type { TransitLookupResult } from 'api/transitLookupApi';
import type { PlaceSuggestion } from 'components/common/PlaceAutocomplete';
import type { DropdownOption } from 'components/common/FormFields/DropDown';
import type { AddMethod } from 'types';

/** How a per-kind form should render. `'edit'` = the full single-screen
 *  form (every field open, no method slicing) — used in EDIT mode and as
 *  the source of truth for each field. `{ method }` = the ADD wizard
 *  slice that shows only the chosen method's input for that kind. */
export type FormMode = 'edit' | { method: AddMethod };

/** Work-in-progress activity the modal assembles before save. Shared by
 *  the parent controller and every per-kind form slice. */
export interface PlaceDraft {
    id?: number;
    /** What kind of activity this entry is — picked once via the
     *  toggle / type-step. Persisted on save; locked on edit. */
    kind?: ActivityKind;
    name?: string;
    location?: string;
    cost?: string | number;
    startTime?: string;
    endTime?: string;
    note?: string;
    status?: DropdownOption;
    image?: ImageRef;
    friends?: Friend[];
    flightSegments?: FlightInfo[];
    transitSegments?: TransitInfo[];
    confirmationNumber?: string;
    hotelInfo?: { confirmationNumber?: string };
    placeKey?: string | null;
    placeCity?: string | null;
    placeCountry?: string | null;
    countryCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    /** Original pasted URL captured by the PLACE smart-entry. Carried on
     *  the draft so it survives save (via the placePayload spread) and
     *  edit hydration. Null/undefined for typed entries and other kinds. */
    sourceUrl?: string | null;
}

/** The cohesive controller bundle the parent assembles once and threads
 *  to whichever per-kind form is rendered. The parent keeps ALL state +
 *  handler logic (and the lookup-watcher wiring); the forms are
 *  presentational consumers of this bundle. */
export interface FormController {
    place: PlaceDraft;
    isAdd: boolean;
    countryScope?: string;
    cityScope?: string;

    handleOnChange: <K extends keyof PlaceDraft>(
        name: K,
        value: PlaceDraft[K] | Friend,
    ) => void;
    handlePlacePicked: (suggestion: PlaceSuggestion) => void;
    /** Fire-and-forget AI field suggestion after a PLACE smart entry
     *  resolves. Fills only-empty cost / time / location on the draft. */
    firePlaceSuggest: (args: {
        name?: string;
        location?: string;
        city?: string | null;
        country?: string | null;
    }) => void;
    /** Fire-and-forget AI field suggestion after a HOTEL smart entry
     *  resolves. Fills only-empty check-in/out time + cost on the draft. */
    fireHotelSuggest: (args: {
        name?: string;
        location?: string;
        city?: string | null;
        country?: string | null;
    }) => void;
    handleImageChange: (
        e: { target: { value: string } } | React.ChangeEvent<HTMLInputElement>,
    ) => void;
    setPlace: Dispatch<SetStateAction<PlaceDraft>>;

    // ---- PLACE smart entry ----
    placeSmartEntry: string;
    setPlaceSmartEntry: (v: string) => void;
    placeSmartLoading: boolean;
    setPlaceSmartLoading: (v: boolean) => void;
    /** True while the post-search AI field-suggest is in flight. Used to hide
     *  the bare-match "couldn't find" warning until the suggest settles, so it
     *  doesn't flash before the suggest backfills the location. */
    placeSuggestLoading: boolean;
    placeSmartWarning: string | null;
    setPlaceSmartWarning: (v: string | null) => void;
    placeDetailsExpanded: boolean;
    setPlaceDetailsExpanded: Dispatch<SetStateAction<boolean>>;

    // ---- FLIGHT ----
    smartEntry: string;
    handleSmartEntry: (text: string) => void;
    expandedSegments: Set<number>;
    openSegments: Set<number>;
    lookupLoading: Set<number>;
    lookupNotFound: Record<number, string>;
    setLookupNotFound: Dispatch<SetStateAction<Record<number, string>>>;
    toggleSegmentOpen: (segIdx: number) => void;
    toggleSegmentExpanded: (segIdx: number) => void;
    handleSegmentField: <K extends keyof FlightInfo>(
        index: number,
        name: K,
        value: FlightInfo[K],
    ) => void;
    handleAddSegment: () => void;
    handleRemoveSegment: (index: number) => void;
    applyFlightLookup: (segIdx: number, result: FlightLookupResult) => void;
    handleLookupLoadingChange: (segIdx: number, loading: boolean) => void;
    setArrivalCity: (city: string | null) => void;

    // ---- HOTEL smart entry ----
    hotelSmartEntry: string;
    setHotelSmartEntry: (v: string) => void;
    hotelSmartLoading: boolean;
    setHotelSmartLoading: (v: boolean) => void;
    hotelSmartWarning: string | null;
    setHotelSmartWarning: (v: string | null) => void;
    hotelDetailsExpanded: boolean;
    setHotelDetailsExpanded: Dispatch<SetStateAction<boolean>>;
    setPendingHotelCheckout: (
        v: { startTime?: string; date?: string } | null,
    ) => void;

    // ---- TRANSIT / GROUND ----
    transitSmartEntry: string;
    setTransitSmartEntry: (v: string) => void;
    transitSmartWarning: string | null;
    transitDetailsExpanded: boolean;
    setTransitDetailsExpanded: Dispatch<SetStateAction<boolean>>;
    transitLookupLoading: Set<number>;
    transitLookupNotFound: Record<number, string>;
    setTransitLookupNotFound: Dispatch<SetStateAction<Record<number, string>>>;
    handleTransitField: <K extends keyof TransitInfo>(
        index: number,
        name: K,
        value: TransitInfo[K],
    ) => void;
    handleAddTransitSegment: () => void;
    handleRemoveTransitSegment: (index: number) => void;
    applyTransitLookup: (segIdx: number, result: TransitLookupResult) => void;
    handleTransitLookupLoadingChange: (
        segIdx: number,
        loading: boolean,
    ) => void;

    // ---- shared helpers ----
    emptySegment: (defaultDate?: string) => FlightInfo;
    emptyTransitSegment: (defaultDate?: string) => TransitInfo;
    isoDefaultDate?: string;
    sameCountry: (
        tripCountry?: string,
        itemCountry?: string | null,
    ) => boolean;
    smartEntryLocation?: string;
}
