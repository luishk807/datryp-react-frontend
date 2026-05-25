import './index.scss';

interface NowLineProps {
    now: Date;
}

const formatClock = (d: Date): string => {
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const NowLine = ({ now }: NowLineProps) => {
    const label = formatClock(now);
    return (
        <div
            className="activity-now-line"
            role="separator"
            aria-label={`Current time, ${label}`}
        >
            <span className="activity-now-line-label">
                <span className="activity-now-line-dot" />
                Now · {label}
            </span>
            <span className="activity-now-line-rule" />
        </div>
    );
};

export default NowLine;
