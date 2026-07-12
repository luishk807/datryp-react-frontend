import {
    useRef,
    useState,
    useEffect,
    useImperativeHandle,
    forwardRef,
    type ReactNode,
} from 'react';
import { ClickAwayListener, Grid } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import './index.scss';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import classNames from 'classnames';
import { useCountries } from 'api/hooks/useCountries';
import { useCountryRecommendations } from 'api/hooks/useCountryRecommendations';
import { usePlaces, type PlaceResult } from 'api/hooks/usePlaces';
import { isQueryBlockedError } from 'api/moderationError';
import { BUTTON_VARIANT } from 'constants';
import type { Country, CountryRecommendation } from 'types';

const SEARCH_VARIANT = {
    STANDARD: 'standard',
    SIMPLE: 'simple',
} as const;

const SEARCH_MODE = {
    COUNTRY: 'country',
    /** Unified city + country autocomplete. Picks fire `onPlaceSelected`
     *  with a `PlaceResult` whose `kind` discriminates between 'city'
     *  and 'country'. Used by the homepage hero. */
    PLACE: 'place',
    RECOMMEND: 'recommend',
} as const;

type SearchBarVariant = (typeof SEARCH_VARIANT)[keyof typeof SEARCH_VARIANT];
export type SearchMode = (typeof SEARCH_MODE)[keyof typeof SEARCH_MODE];

interface SearchBarProps {
    onSelected?: (country: Country) => void;
    /** Fired in 'place' mode after the user picks a result. Receives a
     *  PlaceResult with `kind` discriminator so the parent can route
     *  cities to /city and countries to /country. */
    onPlaceSelected?: (place: PlaceResult) => void;
    defaultValue?: Country;
    className?: string;
    type?: SearchBarVariant;
    /** Externally controlled mode. Defaults to 'country'. */
    mode?: SearchMode;
    /** Fired in 'recommend' mode when the user presses Enter on a non-empty
     *  query. Receives the raw input value (trimmed). */
    onAiSearchSubmit?: (query: string) => void;
    /** Rotating placeholder list for the search input (place OR description
     *  mode). When 2+ entries are given, the input cycles through them every
     *  few seconds (the first entry is the resting prompt; the rest are
     *  example searches). Switching the list (e.g. on a tab change) restarts
     *  from the first entry. Pass a referentially-stable array (module const)
     *  so the rotation timer isn't reset on every parent render. Omitted →
     *  the mode's static placeholder. */
    placeholders?: string[];
}

/** Imperative handle so a parent (the homepage hero) can move DOM focus into
 *  the current mode's search input — e.g. right after the user activates a
 *  "Search by place / interest" tab, so a screen-reader user lands in the
 *  field and hears "Search for a city or country, edit" instead of silence. */
export interface SearchBarHandle {
    focusInput: () => void;
}

// Country lookup is a cheap DB query (no OpenAI); 500ms felt sluggish on
// the AddDestination modal where users expect the dropdown to pop fast.
// 250ms still groups bursty typing into one request without overloading
// the /countries endpoint.
const DEBOUNCE_MS = 250;

// The results popup is a keyboard-walkable listbox. Tab from the input lands on
// the list, Tab again steps through the options (each is a real tab stop), and
// Escape closes the list and returns focus to the input. Only one of
// country/place mode renders a list at a time, so a single id is unambiguous.
const LISTBOX_ID = 'searchbar-results-list';
const optionId = (index: number): string => `${LISTBOX_ID}-opt-${index}`;

/** One rendered result row — country and place modes both map their raw
 *  items to this shape so they can share `renderResultsList`. */
interface ResultRow {
    key: string;
    flagCode: string | null;
    name: string;
    /** Line under the name: the local country name, or the city/country chip. */
    secondary: ReactNode;
    code: string;
    /** Full descriptive accessible name for the option, e.g.
     *  "Chinautla, City, Guatemala" — so a screen reader announces the place
     *  kind and country up front, not the terse visible "Chinautla, Guatemala"
     *  plus a decorative country-code chip. */
    ariaLabel: string;
    /** Text pushed into the input on hover (hover-to-fill). */
    hoverLabel: string;
    onSelect: () => void;
}

/** Two-letter ISO 3166-1 alpha-2 country code → Unicode flag emoji.
 *  Falls back to a globe icon if the code is missing/malformed. */
const flagEmoji = (code?: string | null): string => {
    const c = (code ?? '').trim().toUpperCase();
    if (c.length !== 2) return '🌐';
    const a = 0x1f1e6 - 65;
    return String.fromCodePoint(c.charCodeAt(0) + a, c.charCodeAt(1) + a);
};

const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
    (
        {
            onSelected,
            onPlaceSelected,
            defaultValue,
            className = 'justify-center',
            type = SEARCH_VARIANT.STANDARD,
            mode = SEARCH_MODE.COUNTRY,
            onAiSearchSubmit,
            placeholders,
        },
        ref
    ) => {
        const { t } = useTranslation();
        const inputRef = useRef<HTMLInputElement | null>(null);
        const listRef = useRef<HTMLUListElement | null>(null);
        const [selectedDestination, setSelectedDestination] = useState('');

        // Single text-state across both modes; we just route it to a different
        // submitted-query state based on `mode` so React Query can debounce.
        const [rawQuery, setRawQuery] = useState('');
        const [submittedQuery, setSubmittedQuery] = useState('');

        // Index of the option that currently holds DOM focus (-1 = focus is in
        // the input or the list container), used to reflect aria-selected + the
        // visual highlight. `dismissed` closes the popup on Escape / focus-out
        // WITHOUT clearing the typed text (re-opened by typing or ArrowDown).
        const [activeIndex, setActiveIndex] = useState(-1);
        const [dismissed, setDismissed] = useState(false);

        // Rotating placeholder. The placeholder is only ever visible on an
        // empty, unfocused field, so that's the only time we cycle it — once
        // the user focuses the input or types anything, the animation stops
        // (and resumes if they blur it while still empty). Switching the list
        // (a tab change) restarts from the first entry.
        const [placeholderIdx, setPlaceholderIdx] = useState(0);
        const [isFocused, setIsFocused] = useState(false);

        useImperativeHandle(
            ref,
            () => ({ focusInput: () => inputRef.current?.focus() }),
            []
        );

        const canRotate = !isFocused && rawQuery.trim().length === 0;
        useEffect(() => {
            setPlaceholderIdx(0);
        }, [placeholders]);
        useEffect(() => {
            if (!placeholders || placeholders.length < 2 || !canRotate) return;
            const id = setInterval(() => {
                setPlaceholderIdx((i) => (i + 1) % placeholders.length);
            }, 3000);
            return () => clearInterval(id);
        }, [placeholders, canRotate]);
        const rotatingPlaceholder =
            placeholders && placeholders.length > 0
                ? placeholders[placeholderIdx % placeholders.length]
                : undefined;

        const {
            data: countryResults,
            isFetching: isCountryFetching,
            isError: hasCountryError,
        } = useCountries(submittedQuery, {
            enabled: mode === SEARCH_MODE.COUNTRY && submittedQuery.length > 0,
            limit: 10,
        });

        const {
            data: recommendations,
            isFetching: isRecommending,
            isError: hasRecommendError,
            error: recommendError,
        } = useCountryRecommendations(
            { query: submittedQuery, limit: 6 },
            { enabled: mode === SEARCH_MODE.RECOMMEND && submittedQuery.length > 0 }
        );

        const {
            data: placeResults,
            isFetching: isPlaceFetching,
            isError: hasPlaceError,
        } = usePlaces(submittedQuery, {
            enabled: mode === SEARCH_MODE.PLACE && submittedQuery.length > 0,
            limit: 10,
        });

        useEffect(() => {
            // Clear in-flight state when the user toggles between modes.
            setRawQuery('');
            setSubmittedQuery('');
            setActiveIndex(-1);
            setDismissed(false);
            if (inputRef.current) inputRef.current.value = '';
        }, [mode]);

        // Debounce: 250ms of idle after the last keystroke before firing the query.
        useEffect(() => {
            const trimmed = rawQuery.trim();
            if (!trimmed) {
                setSubmittedQuery('');
                return;
            }
            const handle = setTimeout(() => setSubmittedQuery(trimmed), DEBOUNCE_MS);
            return () => clearTimeout(handle);
        }, [rawQuery]);

        useEffect(() => {
            if (defaultValue) {
                setSelectedDestination(defaultValue.name);
                if (inputRef.current) inputRef.current.value = defaultValue.name;
            }
        }, [defaultValue]);

        const closeResults = () => {
            setRawQuery('');
            setSubmittedQuery('');
            setActiveIndex(-1);
        };

        // After a pick the search bar clears (input value + raw / submitted
        // query state) so the user can immediately start a new search
        // without having to manually delete the previous selection.
        const clearSearchInput = () => {
            setSelectedDestination('');
            if (inputRef.current) inputRef.current.value = '';
            closeResults();
        };

        const handleCountryClick = (item: {
            id: string;
            name: string;
            code: string;
            local: string | null;
        }) => {
            clearSearchInput();
            onSelected?.({
                id: item.id,
                name: item.name,
                code: item.code,
                local: item.local ?? undefined,
            });
        };

        const handlePlaceClick = (place: PlaceResult) => {
            clearSearchInput();
            onPlaceSelected?.(place);
        };

        const handleRecommendationClick = (item: CountryRecommendation) => {
            const country: Country = {
                id: item.id,
                name: item.name,
                code: item.code,
                local: item.local ?? undefined,
                image: item.image ?? undefined,
            };
            clearSearchInput();
            onSelected?.(country);
        };

        const handleListHover = (label: string) => {
            if (inputRef.current) inputRef.current.value = label;
        };

        // A keystroke re-opens a dismissed popup (its results are about to
        // change) and drops any stale option highlight.
        const handleKeystroke = (e: { target: { value: string } }) => {
            setRawQuery(e.target.value);
            setActiveIndex(-1);
            setDismissed(false);
        };

        const handleClickAway = () => closeResults();

        const focusOption = (index: number) => {
            document.getElementById(optionId(index))?.focus();
        };

        // Escape from inside the list: close it and hand focus back to the input
        // ("out of the dropdown, back to the search bar").
        const closeAndRefocusInput = () => {
            setDismissed(true);
            setActiveIndex(-1);
            inputRef.current?.focus();
        };

        // Keydown while the INPUT is focused. Tab (unhandled here) walks into the
        // list natively; ArrowDown is a shortcut straight to the first option,
        // and Escape closes the popup (keeping the typed text).
        const makeInputKeyDown =
            (rows: ResultRow[]) =>
            (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'ArrowDown') {
                    if (dismissed && rawQuery.trim().length > 0) {
                        // Re-open a popup the user had Escaped out of.
                        e.preventDefault();
                        setDismissed(false);
                        return;
                    }
                    if (rows.length > 0) {
                        e.preventDefault();
                        focusOption(0);
                    }
                } else if (
                    e.key === 'Escape' &&
                    !dismissed &&
                    rawQuery.trim().length > 0
                ) {
                    e.preventDefault();
                    setDismissed(true);
                }
            };

        // Keydown on the list CONTAINER (the first Tab stop — "the dropdown").
        // Ignores events bubbling up from an option (they have their own
        // handler). Escape returns to the input; ArrowDown drops onto the first
        // option.
        const makeListboxKeyDown =
            (rows: ResultRow[]) =>
            (e: React.KeyboardEvent<HTMLUListElement>) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeAndRefocusInput();
                } else if (e.key === 'ArrowDown' && rows.length > 0) {
                    e.preventDefault();
                    focusOption(0);
                }
            };

        // Keydown on a focused OPTION. Enter/Space select it, Escape leaves the
        // popup, and the arrows / Home / End move focus between options (ArrowUp
        // from the first option returns to the input).
        const makeOptionKeyDown =
            (rows: ResultRow[], index: number) =>
            (e: React.KeyboardEvent<HTMLLIElement>) => {
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        rows[index].onSelect();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        closeAndRefocusInput();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        focusOption(Math.min(index + 1, rows.length - 1));
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        if (index === 0) inputRef.current?.focus();
                        else focusOption(index - 1);
                        break;
                    case 'Home':
                        e.preventDefault();
                        focusOption(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        focusOption(rows.length - 1);
                        break;
                    default:
                        break;
                }
            };

        // Focus leaving the whole widget (Tab past the last option, or focus
        // jumping elsewhere) closes the popup so it doesn't linger open behind
        // the next control. Moving between the input / list / options keeps
        // focus inside `currentTarget`, so those transitions don't close it.
        const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
            const next = e.relatedTarget;
            // Only close when focus provably moved to an element OUTSIDE the
            // widget. A null relatedTarget (focus target unknown) is left alone
            // so moving between the input / list / options never trips this.
            if (next && !e.currentTarget.contains(next)) {
                setDismissed(true);
                setActiveIndex(-1);
            }
        };

        /** aria-* wiring shared by the standard `<input>` and the simple
         *  variant's InputField. `open` = the listbox is on screen. */
        const comboAria = (open: boolean) => ({
            role: 'combobox' as const,
            'aria-expanded': open,
            'aria-controls': open ? LISTBOX_ID : undefined,
            'aria-autocomplete': 'list' as const,
        });

        // Both modes share this popup markup; each maps its raw items to
        // ResultRow[] first. A polite live region announces the result count,
        // the list container is the first Tab stop, and every option is a real
        // tab stop carrying its set position so a screen reader says
        // "Chinautla, City, Guatemala, 3 of 6" as focus lands on it.
        const renderResultsList = (rows: ResultRow[]) => (
            <>
                <span role="status" className="searchbar-sr-status">
                    {t('search.bar.resultsCount', { count: rows.length })}
                </span>
                <ul
                    id={LISTBOX_ID}
                    ref={listRef}
                    role="listbox"
                    tabIndex={0}
                    aria-label={t('search.bar.resultsAria')}
                    className="searchbar-country-list"
                    onKeyDown={makeListboxKeyDown(rows)}
                >
                    {rows.map((row, index) => {
                        const active = index === activeIndex;
                        return (
                            <li
                                key={row.key}
                                id={optionId(index)}
                                role="option"
                                tabIndex={0}
                                aria-selected={active}
                                aria-label={row.ariaLabel}
                                aria-posinset={index + 1}
                                aria-setsize={rows.length}
                                className={classNames('item searchbar-country-item', {
                                    'is-active': active,
                                })}
                                onClick={row.onSelect}
                                onFocus={() => setActiveIndex(index)}
                                onMouseEnter={() => handleListHover(row.hoverLabel)}
                                onKeyDown={makeOptionKeyDown(rows, index)}
                            >
                                <span
                                    className="searchbar-country-flag"
                                    aria-hidden="true"
                                >
                                    {flagEmoji(row.flagCode)}
                                </span>
                                <span className="searchbar-country-text">
                                    <span className="searchbar-country-name">
                                        {row.name}
                                    </span>
                                    {row.secondary}
                                </span>
                                {/* Decorative duplicate of the flag + country the
                                    accessible name already conveys — hidden. */}
                                <span
                                    className="searchbar-country-code"
                                    aria-hidden="true"
                                >
                                    {row.code}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </>
        );

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            e.target.select();
        };

        const handleBlur = () => setIsFocused(false);

        const renderCountryMode = () => {
            const items = countryResults ?? [];
            const rows: ResultRow[] = items.map((item) => {
                const hasLocal = Boolean(item.local && item.local !== item.name);
                return {
                    key: item.id,
                    flagCode: item.code,
                    name: item.name,
                    secondary: hasLocal ? (
                        <span className="searchbar-country-local">{item.local}</span>
                    ) : null,
                    code: item.code,
                    ariaLabel: hasLocal ? `${item.name}, ${item.local}` : item.name,
                    hoverLabel: item.name,
                    onSelect: () => handleCountryClick(item),
                };
            });
            const trimmed = rawQuery.trim();
            const showLoading = isCountryFetching && items.length === 0 && !hasCountryError;
            const showEmpty =
                submittedQuery && !isCountryFetching && items.length === 0 && !hasCountryError;
            const showDropdown =
                !dismissed &&
                trimmed.length > 0 &&
                (items.length > 0 || showLoading || showEmpty || hasCountryError);
            const open = showDropdown && rows.length > 0;

            return (
                <Grid
                    container
                    className={classNames({
                        container: type === SEARCH_VARIANT.STANDARD,
                        'container-simple': type === SEARCH_VARIANT.SIMPLE,
                    })}
                >
                    {type === SEARCH_VARIANT.STANDARD ? (
                        <Grid item lg={12} md={12} xs={12} className="inputHolder">
                            <input
                                onChange={handleKeystroke}
                                ref={inputRef}
                                className="inputBar"
                                type="text"
                                aria-label={t('search.bar.countryAria')}
                                {...comboAria(open)}
                                onKeyDown={makeInputKeyDown(rows)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                placeholder={t('search.bar.countryPlaceholder')}
                            />
                            {isCountryFetching && (
                                <span className="searchbar-country-spinner" aria-hidden="true" />
                            )}
                        </Grid>
                    ) : (
                        <Grid item lg={12} md={12} xs={12}>
                            <InputField
                                ref={inputRef}
                                defaultValue={selectedDestination}
                                placeholder={t('search.bar.countryPlaceholderSimple')}
                                onChange={handleKeystroke}
                                inputProps={{
                                    ...comboAria(open),
                                    'aria-label': t('search.bar.countryAria'),
                                    onKeyDown: makeInputKeyDown(rows),
                                    onFocus: handleFocus,
                                    onBlur: handleBlur,
                                }}
                            />
                        </Grid>
                    )}

                    {showDropdown && (
                        <div
                            className={classNames({
                                listContainerV2: type === SEARCH_VARIANT.STANDARD,
                                'listContainerV2-simple': type === SEARCH_VARIANT.SIMPLE,
                            })}
                        >
                            {hasCountryError && (
                                <p className="searchbar-recommend-error">
                                    {t('search.bar.countryError')}
                                </p>
                            )}
                            {showLoading && (
                                <p className="searchbar-recommend-loading">
                                    {t('search.bar.searching')}
                                </p>
                            )}
                            {showEmpty && (
                                <p className="searchbar-recommend-empty">
                                    {t('search.bar.noCountries', { query: submittedQuery })}
                                </p>
                            )}
                            {!!rows.length && renderResultsList(rows)}
                        </div>
                    )}
                </Grid>
            );
        };

        const renderPlaceMode = () => {
            const items = placeResults ?? [];
            const rows: ResultRow[] = items.map((place) => {
                const kindLabel =
                    place.kind === 'country'
                        ? t('search.bar.kindCountry')
                        : t('search.bar.kindCity');
                const label =
                    place.kind === 'country'
                        ? place.name
                        : `${place.name}, ${place.countryName}`;
                // Name, kind, then country — e.g. "Chinautla, City, Guatemala" —
                // so the option's place-type is spoken before its country.
                const ariaLabel =
                    place.kind === 'country'
                        ? `${place.name}, ${kindLabel}`
                        : `${place.name}, ${kindLabel}, ${place.countryName}`;
                return {
                    key: place.id,
                    flagCode: place.countryCode,
                    name: label,
                    secondary: (
                        <span className="searchbar-place-kind">{kindLabel}</span>
                    ),
                    code: place.countryCode,
                    ariaLabel,
                    hoverLabel: label,
                    onSelect: () => handlePlaceClick(place),
                };
            });
            const trimmed = rawQuery.trim();
            const showLoading = isPlaceFetching && items.length === 0 && !hasPlaceError;
            const showEmpty =
                submittedQuery && !isPlaceFetching && items.length === 0 && !hasPlaceError;
            const showDropdown =
                !dismissed &&
                trimmed.length > 0 &&
                (items.length > 0 || showLoading || showEmpty || hasPlaceError);
            const open = showDropdown && rows.length > 0;

            return (
                <Grid
                    container
                    className={classNames({
                        container: type === SEARCH_VARIANT.STANDARD,
                        'container-simple': type === SEARCH_VARIANT.SIMPLE,
                    })}
                >
                    {type === SEARCH_VARIANT.STANDARD ? (
                        <Grid item lg={12} md={12} xs={12} className="inputHolder">
                            <input
                                onChange={handleKeystroke}
                                ref={inputRef}
                                className="inputBar"
                                type="text"
                                aria-label={t('search.bar.placeAria')}
                                {...comboAria(open)}
                                onKeyDown={makeInputKeyDown(rows)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                placeholder={
                                    rotatingPlaceholder ??
                                    t('search.bar.placePlaceholder')
                                }
                            />
                            {isPlaceFetching && (
                                <span className="searchbar-country-spinner" aria-hidden="true" />
                            )}
                        </Grid>
                    ) : (
                        <Grid item lg={12} md={12} xs={12}>
                            <InputField
                                ref={inputRef}
                                defaultValue={selectedDestination}
                                placeholder={
                                    rotatingPlaceholder ??
                                    t('search.bar.placePlaceholder')
                                }
                                onChange={handleKeystroke}
                                inputProps={{
                                    ...comboAria(open),
                                    'aria-label': t('search.bar.placeAria'),
                                    onKeyDown: makeInputKeyDown(rows),
                                    onFocus: handleFocus,
                                    onBlur: handleBlur,
                                }}
                            />
                        </Grid>
                    )}

                    {showDropdown && (
                        <div
                            className={classNames({
                                listContainerV2: type === SEARCH_VARIANT.STANDARD,
                                'listContainerV2-simple': type === SEARCH_VARIANT.SIMPLE,
                            })}
                        >
                            {hasPlaceError && (
                                <p className="searchbar-recommend-error">
                                    {t('search.bar.placeError')}
                                </p>
                            )}
                            {showLoading && (
                                <p className="searchbar-recommend-loading">
                                    {t('search.bar.searching')}
                                </p>
                            )}
                            {showEmpty && (
                                <p className="searchbar-recommend-empty">
                                    {t('search.bar.noPlaces', { query: submittedQuery })}
                                </p>
                            )}
                            {!!rows.length && renderResultsList(rows)}
                        </div>
                    )}
                </Grid>
            );
        };

        const renderRecommendMode = () => {
            const items = recommendations?.items ?? [];
            const isBlocked = isQueryBlockedError(recommendError);
            const showEmpty =
                submittedQuery && !isRecommending && items.length === 0 && !hasRecommendError;
            const showLoading = isRecommending && items.length === 0 && !hasRecommendError;
            const showDropdown =
                rawQuery.trim().length > 0 &&
                (items.length > 0 || showEmpty || hasRecommendError || showLoading);

            // When onAiSearchSubmit is wired, the parent handles navigation to
            // /search?q=... and we suppress the inline dropdown entirely.
            const useNavigationFlow = Boolean(onAiSearchSubmit);

            const submitAiSearch = () => {
                const value = rawQuery.trim();
                if (!value) return;
                onAiSearchSubmit?.(value);
            };

            const handleAiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                submitAiSearch();
            };

            return (
                <div className="searchbar-recommend">
                    <div className="searchbar-recommend-form">
                        <input
                            ref={inputRef}
                            type="text"
                            className={classNames('searchbar-recommend-input', {
                                'is-standard': type === SEARCH_VARIANT.STANDARD,
                            })}
                            placeholder={
                                rotatingPlaceholder ??
                                t('search.bar.describePlaceholder')
                            }
                            value={rawQuery}
                            onChange={(e) => setRawQuery(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={useNavigationFlow ? handleAiKeyDown : undefined}
                            aria-label={t('search.bar.describeAria')}
                        />
                        {isRecommending && !useNavigationFlow && (
                            <span className="searchbar-recommend-spinner" aria-hidden="true" />
                        )}
                        {/* Explicit submit affordance: the description mode only
                            searches on Enter, which isn't discoverable — without
                            this button users typed a query then clicked the
                            unrelated "Plan my trip for me" CTA expecting it to
                            search. Mirrors the Enter handler exactly. */}
                        {useNavigationFlow && (
                            <button
                                type="button"
                                className="searchbar-recommend-submit"
                                onClick={submitAiSearch}
                                disabled={!rawQuery.trim()}
                                aria-label={t('nav.search')}
                            >
                                <SearchRoundedIcon className="searchbar-recommend-submit-icon" />
                                <span className="searchbar-recommend-submit-label">
                                    {t('nav.search')}
                                </span>
                            </button>
                        )}
                    </div>

                    {!useNavigationFlow && showDropdown && (
                        <div
                            className={classNames('searchbar-recommend-results', {
                                'is-standard': type === SEARCH_VARIANT.STANDARD,
                            })}
                        >
                            {isBlocked && (
                                <p className="searchbar-recommend-blocked">
                                    <Trans
                                        i18nKey="search.blocked"
                                        components={{
                                            link: (
                                                <Link
                                                    to="/terms"
                                                    className="searchbar-recommend-blocked-link"
                                                />
                                            ),
                                        }}
                                    />
                                </p>
                            )}
                            {hasRecommendError && !isBlocked && (
                                <p className="searchbar-recommend-error">
                                    {t('search.bar.recommendError', {
                                        detail:
                                            recommendError instanceof Error
                                                ? `: ${recommendError.message}`
                                                : '',
                                    })}
                                </p>
                            )}

                            {showLoading && (
                                <p className="searchbar-recommend-loading">
                                    {t('search.bar.searching')}
                                </p>
                            )}

                            {showEmpty && (
                                <p className="searchbar-recommend-empty">
                                    {t('search.bar.noMatches', { query: submittedQuery })}
                                </p>
                            )}

                            {items.map((item) => (
                                <ButtonCustom
                                    key={item.id}
                                    nativeType="button"
                                    type={BUTTON_VARIANT.NONE}
                                    capitalizeType="none"
                                    className="searchbar-recommend-item"
                                    onClick={() => handleRecommendationClick(item)}
                                >
                                    <span className="searchbar-recommend-item-main">
                                        <span className="searchbar-recommend-item-name">
                                            {item.name}
                                        </span>
                                        <span
                                            className="searchbar-recommend-item-country"
                                            aria-hidden="true"
                                        >
                                            {item.code}
                                        </span>
                                    </span>
                                    <span className="searchbar-recommend-item-score">
                                        {Math.round(item.score * 100)}%
                                    </span>
                                </ButtonCustom>
                            ))}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <ClickAwayListener onClickAway={handleClickAway}>
                <Grid
                    container
                    className={`searchbarMain flex w-full ${className}`}
                    onBlur={handleContainerBlur}
                >
                    <Grid
                        item
                        lg={type === SEARCH_VARIANT.STANDARD ? 10 : 12}
                        md={12}
                        xs={12}
                        className={classNames({
                            holder:
                                type === SEARCH_VARIANT.STANDARD &&
                                (mode === SEARCH_MODE.COUNTRY ||
                                    mode === SEARCH_MODE.PLACE),
                            'holder-simple':
                                type === SEARCH_VARIANT.SIMPLE &&
                                (mode === SEARCH_MODE.COUNTRY ||
                                    mode === SEARCH_MODE.PLACE),
                            'holder-recommend': mode === SEARCH_MODE.RECOMMEND,
                        })}
                    >
                        {mode === SEARCH_MODE.COUNTRY && renderCountryMode()}
                        {mode === SEARCH_MODE.PLACE && renderPlaceMode()}
                        {mode === SEARCH_MODE.RECOMMEND && renderRecommendMode()}
                    </Grid>
                </Grid>
            </ClickAwayListener>
        );
    }
);

SearchBar.displayName = 'SearchBar';

export default SearchBar;
