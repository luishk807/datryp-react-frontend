import './index.scss';

export interface LineSeries {
    key: string;
    label: string;
    values: number[];
    color?: string;
}

export interface LineChartProps {
    categories: string[];
    series: LineSeries[];
    height?: number;
    formatX?: (category: string) => string;
    formatY?: (value: number) => string;
}

const DEFAULT_PALETTE = [
    '#f38e40', // primaryOrange
    '#228b22', // primaryGreen
    '#3a86ff',
] as const;

const defaultFormatY = (v: number): string =>
    new Intl.NumberFormat('en-US').format(Math.round(v));

/**
 * Lightweight SVG line chart for time-series. Same coordinate / scale
 * conventions as the BarChart sibling (1200-wide viewBox so text shrinks
 * appropriately when CSS scales the SVG down to typical card widths).
 *
 * Each series renders a polyline plus optional point dots; multiple
 * series are color-coded with a small legend below.
 */
const LineChart = ({
    categories,
    series,
    height = 220,
    formatX = (c) => c,
    formatY = defaultFormatY,
}: LineChartProps) => {
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
    const niceMax = niceCeil(dataMax || 1);
    const yTicks = computeTicks(niceMax, 4);

    // Each category gets evenly spaced along the x axis. The first and
    // last points sit on the inner edges of the plot area so the line
    // stretches the full width.
    const xAt = (i: number): number => {
        if (categories.length <= 1) return PAD_L + plotW / 2;
        return PAD_L + (i / (categories.length - 1)) * plotW;
    };
    const yAt = (v: number): number =>
        PAD_T + plotH - (niceMax > 0 ? (v / niceMax) * plotH : 0);

    return (
        <div className="line-chart-wrap">
            <svg
                className="line-chart-svg"
                viewBox={`0 0 ${VIEW_W} ${viewH}`}
                role="img"
                aria-label={`Line chart with ${categories.length} categories and ${series.length} series`}
                preserveAspectRatio="none"
            >
                {/* Y-axis gridlines + tick labels. The y=0 line renders a
                    bit darker so it reads as the chart's baseline. */}
                {yTicks.map((t, i) => {
                    const y = yAt(t);
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

                {/* Polylines per series. */}
                {series.map((s, si) => {
                    const color =
                        s.color ?? DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
                    const points = s.values
                        .map((v, i) => `${xAt(i)},${yAt(v)}`)
                        .join(' ');
                    return (
                        <g key={s.key}>
                            <polyline
                                fill="none"
                                stroke={color}
                                strokeWidth={3}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                points={points}
                            />
                            {s.values.map((v, i) => (
                                <circle
                                    key={i}
                                    cx={xAt(i)}
                                    cy={yAt(v)}
                                    r={4}
                                    fill="#fff"
                                    stroke={color}
                                    strokeWidth={2}
                                >
                                    <title>{`${formatX(categories[i] ?? '')} · ${s.label}: ${formatY(v)}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}

                {/* X-axis category labels. */}
                {categories.map((cat, i) => (
                    <text
                        key={`x-${i}`}
                        x={xAt(i)}
                        y={PAD_T + plotH + 18}
                        textAnchor="middle"
                        fontSize="14"
                        fill="rgba(0,0,0,0.55)"
                    >
                        {formatX(cat)}
                    </text>
                ))}
            </svg>

            {series.length > 1 && (
                <ul className="line-chart-legend">
                    {series.map((s, i) => {
                        const color =
                            s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
                        return (
                            <li className="line-chart-legend-row" key={s.key}>
                                <span
                                    className="line-chart-legend-swatch"
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

function computeTicks(max: number, count: number): number[] {
    const step = max / count;
    return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
}

export default LineChart;
