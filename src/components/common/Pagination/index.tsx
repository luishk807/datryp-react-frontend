import './index.scss';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import { BUTTON_VARIANT } from 'constants';

export interface PaginationProps {
    /** 1-based current page. */
    page: number;
    /** Total number of pages — when ≤1 the component renders nothing. */
    totalPages: number;
    /** Called with the next page number when the user clicks Prev or Next. */
    onPageChange: (page: number) => void;
    /** Optional ARIA label for the `<nav>` landmark. */
    ariaLabel?: string;
}

/**
 * Compact "Prev / Page X of Y / Next" pager. Stateless — the parent owns
 * the current page and decides how to react. Hides itself when there's
 * only one page so callers don't need to guard at the call site.
 */
const Pagination = ({
    page,
    totalPages,
    onPageChange,
    ariaLabel = 'Pagination',
}: PaginationProps) => {
    if (totalPages <= 1) return null;
    return (
        <nav className="pagination" aria-label={ariaLabel}>
            <ButtonIcon
                type={BUTTON_VARIANT.TEXT_PLAIN}
                className="pagination-btn"
                Icon={ChevronLeftRoundedIcon}
                iconPosition="start"
                iconProps={{ fontSize: 'small' }}
                title="Prev"
                ariaLabel="Previous page"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
            />
            <span className="pagination-indicator">
                Page {page} of {totalPages}
            </span>
            <ButtonIcon
                type={BUTTON_VARIANT.TEXT_PLAIN}
                className="pagination-btn"
                Icon={ChevronRightRoundedIcon}
                iconPosition="end"
                iconProps={{ fontSize: 'small' }}
                title="Next"
                ariaLabel="Next page"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
            />
        </nav>
    );
};

export default Pagination;
