import classNames from 'classnames';
import './index.scss';

export interface AvatarStackPerson {
    id?: string | number;
    name: string;
    /** Avatar photo. Falls back to initials when null/undefined. */
    imageUrl?: string | null;
}

export interface AvatarStackProps {
    people: AvatarStackPerson[];
    /** Max avatars shown before the rest collapse into a "+N" bubble. */
    max?: number;
    /** `sm` = 24px (trip cards), `md` = 32px (detail-page chip). */
    size?: 'sm' | 'md';
    /** Render the trailing "+N" overflow bubble when there are more than
     *  `max` people. Off when the caller shows a separate total count. */
    showOverflow?: boolean;
    className?: string;
}

const initialsFor = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (
        (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
    ).toUpperCase();
};

/**
 * Overlapping circular avatar stack — photo when available, initials
 * fallback otherwise. Shared by the "Visited by N" detail-page chip and
 * the My Trips cards so both read identically.
 */
const AvatarStack = ({
    people,
    max = 3,
    size = 'sm',
    showOverflow = true,
    className,
}: AvatarStackProps) => {
    if (people.length === 0) return null;
    const shown = people.slice(0, max);
    const overflow = people.length - shown.length;

    return (
        <span
            className={classNames('avatar-stack', `size-${size}`, className)}
            aria-hidden="true"
        >
            {shown.map((p, i) =>
                p.imageUrl ? (
                    <img
                        key={p.id ?? i}
                        src={p.imageUrl}
                        alt=""
                        className="avatar-stack-avatar"
                        loading="lazy"
                    />
                ) : (
                    <span
                        key={p.id ?? i}
                        className="avatar-stack-avatar is-placeholder"
                    >
                        {initialsFor(p.name)}
                    </span>
                )
            )}
            {showOverflow && overflow > 0 && (
                <span className="avatar-stack-avatar is-overflow">
                    +{overflow}
                </span>
            )}
        </span>
    );
};

export default AvatarStack;
