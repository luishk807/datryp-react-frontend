import { useState } from 'react';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import classNames from 'classnames';
import './index.scss';

export interface CountryFlagProps {
    /** ISO 3166-1 alpha-2 country code (case-insensitive), e.g. "SV". */
    code?: string | null;
    /** Accessible label / tooltip — usually the country name. */
    title?: string;
    className?: string;
}

const isAlpha2 = (code?: string | null): code is string =>
    !!code && /^[A-Za-z]{2}$/.test(code);

/**
 * Renders a country's flag as an image from flagcdn. Falls back to a globe
 * icon when the code is missing/invalid or the image fails to load — emoji
 * flags are not rendered on Windows/Chrome, so images are used instead.
 */
const CountryFlag = ({ code, title, className }: CountryFlagProps) => {
    const [errored, setErrored] = useState(false);

    if (!isAlpha2(code) || errored) {
        return (
            <PublicRoundedIcon
                className={classNames('country-flag-fallback', className)}
                titleAccess={title}
            />
        );
    }

    const slug = code.toLowerCase();
    return (
        <img
            className={classNames('country-flag', className)}
            src={`https://flagcdn.com/w40/${slug}.png`}
            srcSet={`https://flagcdn.com/w80/${slug}.png 2x`}
            alt={title ?? code.toUpperCase()}
            title={title}
            loading="lazy"
            onError={() => setErrored(true)}
        />
    );
};

export default CountryFlag;
