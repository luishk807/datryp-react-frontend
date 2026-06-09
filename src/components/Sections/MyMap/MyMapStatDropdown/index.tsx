import {
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import classNames from 'classnames';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import './index.scss';

export interface MyMapStatDropdownOption {
    id: string;
    label: string;
    sublabel?: string;
    disabled?: boolean;
    disabledReason?: string;
    /** Count of trips linked to this entry. When > 0 the dropdown
     *  item shows a small green dot + a faint "1 trip" / "3 trips"
     *  caption so the user can scan the list and tell at a glance
     *  which entries will actually populate the trips panel after
     *  click. Falsy / 0 = no dot. */
    tripCount?: number;
}

export interface MyMapStatDropdownProps {
    icon: ReactNode;
    count: number;
    label: string;
    options: MyMapStatDropdownOption[];
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onSelect: (id: string) => void;
    emptyHint?: string;
    /** When provided, renders an eye toggle that shows/hides this layer
     *  on the map. `visible` drives the eye/eye-off icon + a dimmed pill
     *  when off. Omit both to keep the pill as a pure selector. */
    visible?: boolean;
    onToggleVisible?: () => void;
}

const MyMapStatDropdown = ({
    icon,
    count,
    label,
    options,
    isOpen,
    onToggle,
    onClose,
    onSelect,
    emptyHint = 'Nothing here yet.',
    visible = true,
    onToggleVisible,
}: MyMapStatDropdownProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(e.target as Node)) return;
            onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown, { passive: true });
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    return (
        <div
            ref={containerRef}
            className={classNames('my-map-stat-dropdown', {
                'is-open': isOpen,
                'is-hidden': !visible,
            })}
        >
            {onToggleVisible && (
                <button
                    type="button"
                    className="my-map-stat-dropdown-eye"
                    onClick={onToggleVisible}
                    aria-pressed={visible}
                    aria-label={
                        visible
                            ? `Hide ${label} on map`
                            : `Show ${label} on map`
                    }
                    title={visible ? `Hide ${label}` : `Show ${label}`}
                >
                    {visible ? (
                        <VisibilityRoundedIcon fontSize="inherit" />
                    ) : (
                        <VisibilityOffRoundedIcon fontSize="inherit" />
                    )}
                </button>
            )}
            <button
                type="button"
                className="my-map-stat-dropdown-trigger"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={onToggle}
            >
                <span className="my-map-stat-dropdown-icon">{icon}</span>
                <span className="my-map-stat-dropdown-count">
                    <strong>{count}</strong>{' '}
                    <span className="my-map-stat-dropdown-label">
                        {label}
                    </span>
                </span>
                <span className="my-map-stat-dropdown-caret" aria-hidden>
                    ▾
                </span>
            </button>

            {isOpen && (
                <div
                    className="my-map-stat-dropdown-panel"
                    role="listbox"
                    aria-label={label}
                >
                    {options.length === 0 ? (
                        <p className="my-map-stat-dropdown-empty">
                            {emptyHint}
                        </p>
                    ) : (
                        <ul className="my-map-stat-dropdown-list">
                            {options.map((opt) => (
                                <li
                                    key={opt.id}
                                    className="my-map-stat-dropdown-item-wrap"
                                >
                                    <button
                                        type="button"
                                        className={classNames(
                                            'my-map-stat-dropdown-item',
                                            { 'is-disabled': opt.disabled }
                                        )}
                                        disabled={opt.disabled}
                                        title={
                                            opt.disabled
                                                ? opt.disabledReason
                                                : undefined
                                        }
                                        onClick={() => {
                                            if (opt.disabled) return;
                                            onSelect(opt.id);
                                        }}
                                    >
                                        <span className="my-map-stat-dropdown-item-label">
                                            {/* Guard with a strict > 0 ternary
                                              * because `opt.tripCount && …` renders
                                              * the literal `0` before the label
                                              * when tripCount === 0 (React renders
                                              * the number 0, only false/null/undef
                                              * are skipped). */}
                                            {(opt.tripCount ?? 0) > 0 ? (
                                                <span
                                                    className="my-map-stat-dropdown-item-dot"
                                                    aria-label={`${opt.tripCount} trip${opt.tripCount === 1 ? '' : 's'} on file`}
                                                    title={`${opt.tripCount} trip${opt.tripCount === 1 ? '' : 's'} on file`}
                                                />
                                            ) : null}
                                            {opt.label}
                                        </span>
                                        {opt.sublabel && (
                                            <span className="my-map-stat-dropdown-item-sub">
                                                {opt.sublabel}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyMapStatDropdown;
