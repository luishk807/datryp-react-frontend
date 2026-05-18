import { useState } from 'react';
import './index.scss';
import { Snackbar } from '@mui/material';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import classNames from 'classnames';
import { useBookmarks } from 'hooks/useBookmarks';

export interface BookmarkCityButtonProps {
    cityName: string;
    countryName: string;
    countryCode: string;
    imageUrl: string | null;
}

const BookmarkCityButton = ({
    cityName,
    countryName,
    countryCode,
    imageUrl,
}: BookmarkCityButtonProps) => {
    const { isCityBookmarked, toggleCity } = useBookmarks();
    const [toast, setToast] = useState<string | null>(null);

    const saved = isCityBookmarked(cityName, countryCode);

    const handleClick = () => {
        const nowSaved = toggleCity({
            name: cityName,
            country: countryName,
            code: countryCode,
            imageUrl,
        });
        setToast(
            nowSaved
                ? `Saved ${cityName} to your bookmarks`
                : `Removed ${cityName} from bookmarks`
        );
    };

    return (
        <>
            <button
                type="button"
                className={classNames('bookmark-city-pill', {
                    'is-saved': saved,
                })}
                aria-label={
                    saved
                        ? `Remove ${cityName} from bookmarks`
                        : `Save ${cityName} to bookmarks`
                }
                aria-pressed={saved}
                onClick={handleClick}
            >
                {saved ? (
                    <BookmarkRoundedIcon className="bookmark-city-icon" />
                ) : (
                    <BookmarkAddOutlinedIcon className="bookmark-city-icon" />
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

export default BookmarkCityButton;
