import { useState } from 'react';
import './index.scss';
import { Snackbar } from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import classNames from 'classnames';
import { useBookmarks } from 'hooks/useBookmarks';

export interface BookmarkCountryButtonProps {
    countryCode: string;
    countryName: string;
    /** Hero image for the country page — saved with the bookmark so the
     *  /saved list can render the same thumbnail. Optional. */
    imageUrl: string | null;
}

const BookmarkCountryButton = ({
    countryCode,
    countryName,
    imageUrl,
}: BookmarkCountryButtonProps) => {
    const { isCountryBookmarked, toggleCountry } = useBookmarks();
    const [toast, setToast] = useState<string | null>(null);

    const saved = isCountryBookmarked(countryCode);

    const handleClick = () => {
        const nowSaved = toggleCountry({
            code: countryCode,
            name: countryName,
            imageUrl,
        });
        setToast(
            nowSaved
                ? `Saved ${countryName} to your bookmarks`
                : `Removed ${countryName} from bookmarks`
        );
    };

    return (
        <>
            <button
                type="button"
                className={classNames('bookmark-country-pill', {
                    'is-saved': saved,
                })}
                aria-label={
                    saved
                        ? `Remove ${countryName} from bookmarks`
                        : `Save ${countryName} to bookmarks`
                }
                aria-pressed={saved}
                onClick={handleClick}
            >
                {saved ? (
                    <BookmarkRoundedIcon className="bookmark-country-icon" />
                ) : (
                    <BookmarkAddOutlinedIcon className="bookmark-country-icon" />
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

export default BookmarkCountryButton;
