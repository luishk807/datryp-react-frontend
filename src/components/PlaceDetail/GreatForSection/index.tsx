import './index.scss';
import { useTranslation } from 'react-i18next';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

// Emoji per tag, derived in the frontend (kept in sync with the backend's
// GREAT_FOR_TAGS vocabulary). Unknown tags simply render label-only.
const TAG_EMOJI: Record<string, string> = {
    couples: '💑',
    families: '👨‍👩‍👧',
    solo: '🧍',
    friends: '👥',
    backpackers: '🎒',
    nomads: '💻',
    luxury: '✨',
    foodies: '🍜',
    nature: '🏞️',
    nightlife: '🌃',
    culture: '🏛️',
    history: '🏰',
    beaches: '🏖️',
    adventure: '⛰️',
};

export interface GreatForSectionProps {
    /** ISO-2 country code the "great for" tags are curated / AI-generated for. */
    code: string;
    /** Destination-specific tags (city / place detail slice). When present +
     *  non-empty, they're shown instead of the country's tags so a city/place
     *  page reflects the locale, not its whole country. Falls back to the
     *  country facts when omitted / empty (older cached rows, country pages). */
    greatFor?: string[];
}

/**
 * "Great for" sidebar card — a quick "is this my kind of trip?" read, as a row
 * of emoji chips (couples / families / foodies / nature …) drawn from a closed
 * vocabulary. Served on the same /country-facts payload as Quick facts.
 * Self-hides while loading, on error, and when there are no tags.
 */
const GreatForSection = ({ code, greatFor }: GreatForSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    // Locale tags win when present; otherwise fall back to the country's.
    const tags =
        greatFor && greatFor.length > 0 ? greatFor : data?.greatFor ?? [];
    if (tags.length === 0) return null;

    return (
        <DetailSection
            className="great-for-section"
            title={t('greatFor.title')}
            icon={<FavoriteRoundedIcon />}
            contentRead="items"
        >
            <ul className="great-for-chips">
                {tags.map((tag) => {
                    const label = t(`greatFor.tags.${tag}`, {
                        defaultValue: tag,
                    });
                    return (
                        // Each chip is its own keyboard tab stop so screen-reader
                        // + keyboard users Tab through them one by one and hear
                        // each label (the emoji is decorative), rather than the
                        // whole card being a single stop.
                        <li
                            key={tag}
                            className="great-for-chip"
                            tabIndex={0}
                            aria-label={label}
                        >
                            {TAG_EMOJI[tag] && (
                                <span className="great-for-emoji" aria-hidden>
                                    {TAG_EMOJI[tag]}
                                </span>
                            )}
                            <span className="great-for-label">{label}</span>
                        </li>
                    );
                })}
            </ul>
        </DetailSection>
    );
};

export default GreatForSection;
