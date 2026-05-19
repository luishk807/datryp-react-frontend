import './index.scss';

export interface PieSlice {
    key: string;
    label: string;
    count: number;
}

export interface PieChartProps {
    slices: PieSlice[];
    /** Diameter in viewBox units. The SVG scales responsively via CSS. */
    size?: number;
    /** Per-key color lookup. Falls back to a default palette cycled by
     *  slice index when the key isn't in the map. */
    colorByKey?: Record<string, string>;
}

const DEFAULT_PALETTE = [
    '#f38e40',
    '#228b22',
    '#3a86ff',
    '#8338ec',
    '#ffbe0b',
    '#fb5607',
    '#06aed5',
    '#9aa0a6',
] as const;

/**
 * Pure-SVG pie chart, no chart-library dependency.
 *
 * Each slice is one SVG `<path>` computed from the cumulative angle.
 * A single-slice (100%) case is rendered as a full circle since two
 * arc endpoints at the same angle would otherwise collapse.
 */
const PieChart = ({
    slices,
    size = 220,
    colorByKey = {},
}: PieChartProps) => {
    const positive = slices.filter((s) => s.count > 0);
    const total = positive.reduce((sum, s) => sum + s.count, 0);

    if (total === 0) {
        return (
            <div className="pie-chart-wrap">
                <div className="pie-chart-empty" aria-label="No data">
                    No data
                </div>
            </div>
        );
    }

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    let cumulative = 0;
    const paths = positive.map((slice, i) => {
        const fraction = slice.count / total;
        const startAngle = cumulative * 2 * Math.PI;
        cumulative += fraction;
        const endAngle = cumulative * 2 * Math.PI;

        const sx = cx + r * Math.cos(startAngle - Math.PI / 2);
        const sy = cy + r * Math.sin(startAngle - Math.PI / 2);
        const ex = cx + r * Math.cos(endAngle - Math.PI / 2);
        const ey = cy + r * Math.sin(endAngle - Math.PI / 2);
        const largeArc = fraction > 0.5 ? 1 : 0;

        const color =
            colorByKey[slice.key] ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];

        // Single 100% slice — full circle via two semicircle arcs so the
        // path closes cleanly. Otherwise: pie wedge from the center.
        const d =
            fraction >= 0.9999
                ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
                : `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`;

        return (
            <path
                key={slice.key}
                d={d}
                fill={color}
                stroke="#fff"
                strokeWidth={fraction >= 0.9999 ? 0 : 2}
            >
                <title>{`${slice.label}: ${slice.count} (${((fraction) * 100).toFixed(0)}%)`}</title>
            </path>
        );
    });

    return (
        <div className="pie-chart-wrap">
            <svg
                className="pie-chart-svg"
                viewBox={`0 0 ${size} ${size}`}
                role="img"
                aria-label={`Pie chart, ${total} across ${positive.length} buckets`}
            >
                {paths}
            </svg>
            <ul className="pie-chart-legend">
                {positive.map((slice, i) => {
                    const color =
                        colorByKey[slice.key] ??
                        DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
                    const pct = ((slice.count / total) * 100).toFixed(0);
                    return (
                        <li key={slice.key} className="pie-chart-legend-row">
                            <span
                                className="pie-chart-legend-swatch"
                                style={{ background: color }}
                                aria-hidden="true"
                            />
                            <span className="pie-chart-legend-label">
                                {slice.label}
                            </span>
                            <span className="pie-chart-legend-meta">
                                {slice.count} · {pct}%
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default PieChart;
