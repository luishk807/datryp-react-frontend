import classNames from 'classnames';
import type { CSSProperties } from 'react';
import './index.scss';

export interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    /** CSS border-radius. Pass a number for px, or any CSS string ('50%', '8px'). */
    radius?: string | number;
    className?: string;
}

const toCssSize = (value: string | number | undefined): string | undefined => {
    if (value === undefined) return undefined;
    return typeof value === 'number' ? `${value}px` : value;
};

/**
 * Generic shimmer placeholder. Compose multiple together to build loading
 * states that match a real component's shape (see PlaceResultCardSkeleton).
 */
const Skeleton = ({ width, height, radius = 4, className }: SkeletonProps) => {
    const style: CSSProperties = {
        width: toCssSize(width),
        height: toCssSize(height),
        borderRadius: toCssSize(radius),
    };
    return (
        <span
            className={classNames('skeleton', className)}
            style={style}
            aria-hidden="true"
        />
    );
};

export default Skeleton;
