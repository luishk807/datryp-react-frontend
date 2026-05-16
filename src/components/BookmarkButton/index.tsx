import { useState } from 'react';
import './index.scss';
import { Snackbar } from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import classNames from 'classnames';
import { useBookmarks } from 'hooks/useBookmarks';
import type { PlaceRecommendation } from 'types';

export interface BookmarkButtonProps {
    place: PlaceRecommendation;
    /** Search query used as part of the bookmark identity (so re-opening
     *  the place from the bookmarks list still hits the cached recommender). */
    query: string;
    index: number;
}

const BookmarkButton = ({ place, query, index }: BookmarkButtonProps) => {
    const { isBookmarked, toggle } = useBookmarks();
    const [toast, setToast] = useState<string | null>(null);

    const saved = isBookmarked(query, index);

    const handleClick = () => {
        const nowSaved = toggle(place, query, index);
        setToast(nowSaved ? `Saved ${place.name} to your bookmarks` : `Removed ${place.name} from bookmarks`);
    };

    return (
        <>
            <button
                type="button"
                className={classNames('bookmark-button-pill', { 'is-saved': saved })}
                aria-label={saved ? `Remove ${place.name} from bookmarks` : `Save ${place.name} to bookmarks`}
                aria-pressed={saved}
                onClick={handleClick}
            >
                {saved ? (
                    <BookmarkRoundedIcon className="bookmark-button-icon" />
                ) : (
                    <BookmarkAddOutlinedIcon className="bookmark-button-icon" />
                )}
                <span>{saved ? 'Saved' : 'Save'}</span>
            </button>

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2200}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </>
    );
};

export default BookmarkButton;
