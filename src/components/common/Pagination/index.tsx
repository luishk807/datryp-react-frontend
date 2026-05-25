/**
 * Numbered page pager (1 2 3 …) with prev/next buttons. Wraps MUI's
 * `Pagination` so callers get the familiar numbered UI without owning
 * MUI's typing internals; the API stays at `page`/`totalPages`/
 * `onPageChange` so every consumer (Notifications, My Trips, Bucket
 * List, Friends, Recent Searches, Reviews) treats it as a stateless
 * controlled component.
 *
 * Hides itself when totalPages <= 1 so call sites don't need a guard.
 */
import './index.scss';
import MuiPagination from '@mui/material/Pagination';

export interface PaginationProps {
    /** 1-based current page. */
    page: number;
    /** Total number of pages — when ≤1 the component renders nothing. */
    totalPages: number;
    /** Called with the next page number when the user clicks a page,
     *  Prev, or Next. */
    onPageChange: (page: number) => void;
    /** Optional ARIA label for the `<nav>` landmark. */
    ariaLabel?: string;
}

const Pagination = ({
    page,
    totalPages,
    onPageChange,
    ariaLabel = 'Pagination',
}: PaginationProps) => {
    if (totalPages <= 1) return null;
    return (
        <nav className="pagination" aria-label={ariaLabel}>
            <MuiPagination
                count={totalPages}
                page={page}
                onChange={(_, value) => onPageChange(value)}
                shape="rounded"
                color="primary"
                siblingCount={1}
                boundaryCount={1}
                showFirstButton
                showLastButton
            />
        </nav>
    );
};

export default Pagination;
