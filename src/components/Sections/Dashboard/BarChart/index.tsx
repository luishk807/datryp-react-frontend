import './index.scss';

export interface BarSeries {
    /** Stable key, used for legend + per-series color lookup. */
    key: string;
    /** Display label in the legend. */
    label: string;
    /** One numeric value per category, same length and order as the
     *  parent `categories` prop. */
    values: number[];
    /** Optional explicit color. Falls back to a palette cycled by
     *  series index when omitted. */
    color?: string;
}

export interface BarChartProps {
    /** X-axis category labels — usually `YYYY-MM` strings. */
    categories: string[];
    /** One or more series. When > 1, bars are rendered side-by-side
     *  per category (grouped bar chart). */
    series: BarSeries[];
    /** Pixel height of the plot area. Width is responsive — the SVG
     *  uses `width: 100%` and an explicit viewBox. */
    height?: number;
    /** Optional per-category x-axis label formatter. Receives the raw
     *  category string; default returns it unchanged. Useful for
     *  collapsing `2026-05` → `May`. */
    formatX?: (category: string) => string;
    /** Optional y-axis value formatter — used for the y-tick labels and
     *  the bar tooltips. Defaults to integer with thousands separators. */
    formatY?: (value: number) => string;
}

const DEFAULT_PALETTE = [
    '#f38e40', // primaryOrange
    '#228b22', // primaryGreen
    '#3a86ff',
    '#8338ec',
    '#ffbe0b',
] as const;

const defaultFormatY = (v: number): string =>
    new Intl.NumberFormat('en-US').format(Math.round(v));

/**
 * Lightweight, responsive grouped bar chart. Pure SVG, no chart-library
 * dependency. Renders 3-5 horizontal grid lines + bars + x/y axis labels.
 *
 * The chart fills its container width (SVG viewBox = a fixed 800 ×
 * `height + padding`, scaled by CSS). Bars within a category are
 * grouped side-by-side when `series.length > 1`.
 */
const BarChart = ({
    categories,
    series,
    height = 220,
    formatX = (c) => c,
    formatY = defaultFormatY,
}: BarChartProps) => {
    // The viewBox is wider than typical card widths so when the SVG is
    // scaled down by CSS, text shrinks toward its intended on-screen
    // size (~10-11px) rather than getting inflated.
    const VIEW_W = 1200;
    const PAD_L = 56;
    const PAD_R = 16;
    const PAD_T = 8;
    const PAD_B = 28;
    const plotW = VIEW_W - PAD_L - PAD_R;
    const plotH = height;
    const viewH = plotH + PAD_T + PAD_B;

    const allValues = series.flatMap((s) => s.values);
    const dataMax = Math.max(0, ...allValues);
    // Round the max up to a "nice" number so the y-axis ticks read well
    // (4, 8, 10, 20, 50, 100, etc.) instead of a raw count like 17.
    const niceMax = niceCeil(dataMax || 1);
    const yTicks = computeTicks(niceMax, 4);

    const groupW = categories.length > 0 ? plotW / categories.length : plotW;
    const seriesCount = Math.max(1, series.length);
    // Bar width scales with the wider viewBox so bars don't look anemic
    // in the larger coordinate system.
    const barW = Math.min((groupW * 0.7) / seriesCount, 36);
    const groupInner = barW * seriesCount;
    const groupLeftPad = (groupW - groupInner) / 2;

    return (
        <div className="bar-chart-wrap">
            <svg
                className="bar-chart-svg"
                viewBox={`0 0 ${VIEW_W} ${viewH}`}
                role="img"
                aria-label={`Bar chart with ${categories.length} categories and ${series.length} series`}
                preserveAspectRatio="none"
            >
                {/* Y-axis gridlines + tick labels. The bottom tick (y=0)
                    renders a slightly darker baseline so the bars don't
                    appear to float in space. */}
                {yTicks.map((t, i) => {
                    const y = PAD_T + plotH - (t / niceMax) * plotH;
                    const isBaseline = i === 0;
                    return (
                        <g key={`y-${t}`}>
                            <line
                                x1={PAD_L}
                                x2={VIEW_W - PAD_R}
                                y1={y}
                                y2={y}
                                stroke={
                                    isBaseline
                                        ? 'rgba(0,0,0,0.15)'
                                        : 'rgba(0,0,0,0.06)'
                                }
                                strokeWidth={1}
                            />
                            <text
                                x={PAD_L - 8}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="14"
                                fill="rgba(0,0,0,0.5)"
                            >
                                {formatY(t)}
                            </text>
                        </g>
                    );
                })}

                {/* Bars per category. */}
                {categories.map((cat, ci) => {
                    const groupX = PAD_L + ci * groupW + groupLeftPad;
                    return (
                        <g key={cat}>
                            {series.map((s, si) => {
                                const v = s.values[ci] ?? 0;
                                const h = niceMax > 0 ? (v / niceMax) * plotH : 0;
                                const x = groupX + si * barW;
                                const y = PAD_T + plotH - h;
                                const color =
                                    s.color ??
                                    DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
                                return (
                                    <rect
                                        key={`${s.key}-${ci}`}
                                        x={x}
                                        y={y}
                                        width={Math.max(1, barW - 2)}
                                        height={Math.max(0, h)}
                                        fill={color}
                                        rx={2}
                                    >
                                        <title>
                                            {`${formatX(cat)} · ${s.label}: ${formatY(v)}`}
                                        </title>
                                    </rect>
                                );
                            })}
                            <text
                                x={PAD_L + ci * groupW + groupW / 2}
                                y={PAD_T + plotH + 18}
                                textAnchor="middle"
                                fontSize="14"
                                fill="rgba(0,0,0,0.55)"
                            >
                                {formatX(cat)}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {series.length > 1 && (
                <ul className="bar-chart-legend">
                    {series.map((s, i) => {
                        const color =
                            s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
                        return (
                            <li className="bar-chart-legend-row" key={s.key}>
                                <span
                                    className="bar-chart-legend-swatch"
                                    style={{ background: color }}
                                    aria-hidden="true"
                                />
                                <span>{s.label}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

/** Round `n` up to a "nice" number — 1, 2, 5 × 10^k. Keeps y-axis ticks
 *  on familiar boundaries instead of arbitrary maxima. */
function niceCeil(n: number): number {
    if (n <= 0) return 1;
    const exp = Math.floor(Math.log10(n));
    const base = Math.pow(10, exp);
    const norm = n / base;
    let nice: number;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * base;
}

/** Evenly-spaced ticks from 0 to `max` (inclusive), inclusive of `count`
 *  steps. So `computeTicks(100, 4)` → [0, 25, 50, 75, 100]. */
function computeTicks(max: number, count: number): number[] {
    const step = max / count;
    return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
}

export default BarChart;
