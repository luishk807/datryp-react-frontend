import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import Skeleton from 'components/common/Skeleton';
import type { NamedTip } from 'types';
import './index.scss';

export interface MustDoListProps {
    items: NamedTip[];
}

/**
 * "Don't leave without" list. Earlier iteration tried a numbered-card
 * style with a green slab + orange star + bold "01 / 02 / 03" digits;
 * users found it loud and the numeric ordering felt arbitrary for a
 * "must-do" set with no intrinsic priority. This pass strips the
 * chrome down to a quiet star bullet + name/why pair separated by
 * thin dividers — reads as a personal checklist, not a marketing
 * carousel.
 */
const MustDoList = ({ items }: MustDoListProps) => {
    const { t } = useTranslation();
    if (!items?.length) return null;
    return (
        <ul
            className="must-do-list"
            aria-label={t('detail.common.localFlavor.mustDoAria')}
        >
            {items.map((item, idx) => (
                <li key={`${item.name}-${idx}`} className="must-do-item">
                    <StarsRoundedIcon
                        className="must-do-star"
                        fontSize="small"
                        aria-hidden="true"
                    />
                    <span className="must-do-body">
                        <span className="must-do-name">{item.name}</span>
                        <span className="must-do-why">{item.why}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
};

export interface MustDoListSkeletonProps {
    rows?: number;
}

export const MustDoListSkeleton = ({ rows = 5 }: MustDoListSkeletonProps) => (
    <ul
        className={classNames('must-do-list', 'is-skeleton')}
        aria-hidden="true"
    >
        {Array.from({ length: rows }).map((_, i) => (
            <li key={i} className="must-do-item">
                <StarsRoundedIcon
                    className="must-do-star"
                    fontSize="small"
                    aria-hidden="true"
                />
                <span className="must-do-body">
                    <Skeleton width="55%" height={14} radius={4} />
                    <Skeleton width="92%" height={12} radius={4} />
                </span>
            </li>
        ))}
    </ul>
);

export default MustDoList;
