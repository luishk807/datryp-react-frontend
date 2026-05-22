/**
 * Multi-select pill picker with an inline search box. Used for slug-based
 * catalogs (interests, traveler styles) and ISO-2-coded lists (dream
 * destinations).
 *
 * Why a dedicated component instead of `FormFields/Autocomplete`: the
 * existing autocomplete is typed to `{ id: number, label: string }` and
 * mirrors props into local state in a way that doesn't fit slug-based
 * multi-select. The two interactions are also different enough that a
 * dedicated picker is cheaper than retrofitting.
 *
 * Shape:
 * - Single search input on top.
 * - All options render as wrapping pills below — selected pills are green
 *   (using `primaryGreen`), unselected pills are a neutral light gray.
 * - Click any pill to toggle. Clicking a green pill removes it.
 * - Typing in the search filters the visible pills. Pressing Enter
 *   selects the first unselected match and clears the input so the user
 *   can keep typing to add the next one.
 */
import { useId, useMemo, useState } from 'react';
import classnames from 'classnames';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import './index.scss';

export interface SearchablePickerOption {
    value: string;
    label: string;
}

export interface SearchablePickerProps {
    label: string;
    options: SearchablePickerOption[];
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    helperText?: string;
    disabled?: boolean;
    /** Cap on the rendered pill area height (CSS value). Past this the
     *  area scrolls. Set generously for small catalogs (interests, styles)
     *  and tighter for large ones (countries) so the page doesn't grow
     *  forever. */
    listMaxHeight?: string;
    /** Cap how many values the user can keep selected. Omit for unlimited. */
    maxSelected?: number;
    /** Shown when the filter matches nothing. */
    emptyText?: string;
}

const SearchablePicker = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Search…',
    helperText,
    disabled = false,
    listMaxHeight = '260px',
    maxSelected,
    emptyText = 'No matches.',
}: SearchablePickerProps) => {
    const labelId = useId();
    const [search, setSearch] = useState('');

    const selectedSet = useMemo(() => new Set(value), [value]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, search]);

    const atCap =
        typeof maxSelected === 'number' && value.length >= maxSelected;

    const toggle = (slug: string) => {
        if (disabled) return;
        if (selectedSet.has(slug)) {
            onChange(value.filter((v) => v !== slug));
            return;
        }
        if (atCap) return;
        onChange([...value, slug]);
    };

    const handleSearchKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const q = search.trim().toLowerCase();
        if (!q) return;
        // Find the first match that isn't already selected — Enter is
        // meant to ADD, so it shouldn't deselect when the typed term
        // matches an already-green pill.
        const firstUnselectedMatch = filtered.find(
            (o) => !selectedSet.has(o.value)
        );
        if (!firstUnselectedMatch) return;
        if (atCap) return;
        toggle(firstUnselectedMatch.value);
        setSearch('');
    };

    return (
        <div
            className={classnames('searchable-picker', { 'is-disabled': disabled })}
        >
            <label className="searchable-picker-label" id={labelId}>
                {label}
            </label>

            <div className="searchable-picker-search">
                <SearchRoundedIcon
                    className="searchable-picker-search-icon"
                    fontSize="small"
                    aria-hidden="true"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-labelledby={labelId}
                />
            </div>

            <div
                className="searchable-picker-pills"
                role="listbox"
                aria-labelledby={labelId}
                aria-multiselectable="true"
                style={{ maxHeight: listMaxHeight }}
            >
                {filtered.length === 0 ? (
                    <p className="searchable-picker-empty">{emptyText}</p>
                ) : (
                    filtered.map((o) => {
                        const active = selectedSet.has(o.value);
                        const lockedOut = !active && atCap;
                        return (
                            <button
                                key={o.value}
                                type="button"
                                className={classnames('searchable-picker-pill', {
                                    'is-active': active,
                                    'is-locked': lockedOut,
                                })}
                                role="option"
                                aria-selected={active}
                                onClick={() => toggle(o.value)}
                                disabled={disabled || lockedOut}
                                title={
                                    active
                                        ? `Remove ${o.label}`
                                        : lockedOut
                                            ? 'Selection cap reached'
                                            : `Add ${o.label}`
                                }
                            >
                                {o.label}
                            </button>
                        );
                    })
                )}
            </div>

            {helperText && (
                <p className="searchable-picker-helper">{helperText}</p>
            )}
        </div>
    );
};

export default SearchablePicker;
