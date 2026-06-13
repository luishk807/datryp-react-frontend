import { useEffect, useRef, useState, type ReactNode } from 'react';
import classNames from 'classnames';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import CheckBoxRoundedIcon from '@mui/icons-material/CheckBoxRounded';
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CountryFlag from 'components/common/CountryFlag';
import type { MyMapStatDropdownOption } from '../MyMapStatDropdown';
import './index.scss';

/** One map layer as presented in the mobile Layers menu. Mirrors the
 *  props each desktop `MyMapStatDropdown` pill is wired with, so the
 *  page passes the same handlers to both. */
export interface MyMapLayerDescriptor {
    key: string;
    icon: ReactNode;
    label: string;
    count: number;
    /** Layer visibility (the eye toggle on desktop). */
    visible: boolean;
    onToggleVisible: () => void;
    /** Fly-to list for this layer (countries / cities / places). */
    options: MyMapStatDropdownOption[];
    onSelect: (id: string) => void;
    emptyHint?: string;
}

export interface MyMapLayersMenuProps {
    layers: MyMapLayerDescriptor[];
}

/**
 * Mobile-only consolidation of the four desktop stat pills into ONE
 * "Layers" button — phones don't have the width for four permanent
 * pills, and the map is the point. Tapping opens a panel:
 *   - main view: one row per layer with a visibility checkbox + count;
 *     tap the row to drill into that layer's fly-to list.
 *   - list view: the selected layer's places, with a back arrow.
 *
 * Hidden on desktop via CSS (`.my-map-layers` is `display:none` above
 * the mobile breakpoint) — desktop keeps the four pills.
 */
const MyMapLayersMenu = ({ layers }: MyMapLayersMenuProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [activeKey, setActiveKey] = useState<string | null>(null);

    const total = layers.reduce((sum, l) => sum + l.count, 0);
    const active = layers.find((l) => l.key === activeKey) ?? null;

    const close = () => {
        setOpen(false);
        setActiveKey(null);
    };

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(e.target as Node)) return;
            close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown, { passive: true });
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div
            ref={containerRef}
            className={classNames('my-map-layers', { 'is-open': open })}
        >
            <button
                type="button"
                className="my-map-layers-trigger"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => (open ? close() : setOpen(true))}
            >
                <LayersRoundedIcon fontSize="small" />
                <span className="my-map-layers-trigger-text">Layers</span>
                <span className="my-map-layers-trigger-count">{total}</span>
            </button>

            {open && (
                <div className="my-map-layers-panel" role="menu">
                    {active === null ? (
                        <ul className="my-map-layers-list">
                            {layers.map((layer) => (
                                <li
                                    key={layer.key}
                                    className="my-map-layers-row"
                                >
                                    <button
                                        type="button"
                                        className="my-map-layers-check"
                                        aria-pressed={layer.visible}
                                        aria-label={
                                            layer.visible
                                                ? `Hide ${layer.label}`
                                                : `Show ${layer.label}`
                                        }
                                        onClick={layer.onToggleVisible}
                                    >
                                        {layer.visible ? (
                                            <CheckBoxRoundedIcon fontSize="small" />
                                        ) : (
                                            <CheckBoxOutlineBlankRoundedIcon fontSize="small" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="my-map-layers-row-main"
                                        onClick={() =>
                                            setActiveKey(layer.key)
                                        }
                                    >
                                        <span className="my-map-layers-row-icon">
                                            {layer.icon}
                                        </span>
                                        <span className="my-map-layers-row-label">
                                            {layer.label}
                                        </span>
                                        <span className="my-map-layers-row-count">
                                            {layer.count}
                                        </span>
                                        <ChevronRightRoundedIcon
                                            className="my-map-layers-row-chevron"
                                            fontSize="small"
                                        />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="my-map-layers-detail">
                            <div className="my-map-layers-detail-head">
                                <button
                                    type="button"
                                    className="my-map-layers-back"
                                    onClick={() => setActiveKey(null)}
                                    aria-label="Back to layers"
                                >
                                    <ArrowBackRoundedIcon fontSize="small" />
                                </button>
                                <span className="my-map-layers-detail-title">
                                    {active.label}
                                </span>
                                <span className="my-map-layers-detail-count">
                                    {active.count}
                                </span>
                            </div>
                            {active.options.length === 0 ? (
                                <p className="my-map-layers-empty">
                                    {active.emptyHint ?? 'Nothing here yet.'}
                                </p>
                            ) : (
                                <ul className="my-map-layers-options">
                                    {active.options.map((opt) => (
                                        <li key={opt.id}>
                                            <button
                                                type="button"
                                                className={classNames(
                                                    'my-map-layers-option',
                                                    {
                                                        'is-disabled':
                                                            opt.disabled,
                                                    }
                                                )}
                                                disabled={opt.disabled}
                                                title={
                                                    opt.disabled
                                                        ? opt.disabledReason
                                                        : undefined
                                                }
                                                onClick={() => {
                                                    if (opt.disabled) return;
                                                    active.onSelect(opt.id);
                                                    close();
                                                }}
                                            >
                                                <span className="my-map-layers-option-label">
                                                    {opt.flagCode && (
                                                        <CountryFlag
                                                            code={opt.flagCode}
                                                            className="my-map-opt-flag"
                                                        />
                                                    )}
                                                    {opt.label}
                                                </span>
                                                {opt.sublabel && (
                                                    <span className="my-map-layers-option-sub">
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
            )}
        </div>
    );
};

export default MyMapLayersMenu;
