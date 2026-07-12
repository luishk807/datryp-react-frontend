import './index.scss';
import { useTranslation } from 'react-i18next';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import GreatForSection from 'components/PlaceDetail/GreatForSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';
import { useMyPreferences } from 'api/hooks/useMyPreferences';
import { useDestinationFit } from 'api/hooks/useDestinationFit';
import { useUser } from 'context/UserContext';
import { computeDestinationMatch } from './match';

// Emoji per interest slug (kept in sync with app/core/interests.py). Unknown
// slugs simply render label-only.
const INTEREST_EMOJI: Record<string, string> = {
    foodie: '🍜',
    beach: '🏖️',
    hiking: '🥾',
    museums: '🏛️',
    nightlife: '🌃',
    family: '👨‍👩‍👧',
    solo: '🧍',
    budget: '💰',
    luxury: '✨',
    road_trips: '🚗',
    wellness: '🧘',
    photography: '📷',
    diving: '🤿',
    skiing: '🎿',
    festivals: '🎉',
    local_culture: '🏮',
};

export interface MatchForYouSectionProps {
    /** ISO-2 country code the destination's "Great for" tags come from. */
    code: string;
    /** Destination cost level (1-5), for the budget/luxury cross-check. */
    costLevel?: number;
    /** Destination display name — powers the Pro "personal take" AI opinion. */
    name: string;
    /** Country name for the AI take's context. */
    country?: string;
    /** Which detail page this is, for the AI take's phrasing. */
    kind: 'country' | 'city' | 'place';
    /** The destination's OWN "Great for" tags (from the city / place detail
     *  slice). When present they're used instead of the country's tags, and the
     *  "might not satisfy" misses become trustworthy — they now describe THIS
     *  locale, not the whole country. Omitted on country pages, which read the
     *  country facts directly. Empty (older cached rows) → country fallback. */
    greatFor?: string[];
}

/**
 * "Is this right for you?" sidebar widget. A logged-in traveler with saved
 * interests gets a personalized match — a %, the interests this destination
 * meets, and any specific ones it may not — computed ENTIRELY client-side from
 * their preferences × the destination's "Great for" tags, so it costs no API
 * call. Everyone else (logged out, or no interests saved, or nothing to match
 * on) falls back to the plain "Great for" chips, unchanged.
 */
const MatchForYouSection = ({
    code,
    costLevel,
    name,
    country,
    kind,
    greatFor,
}: MatchForYouSectionProps) => {
    const { t } = useTranslation();
    const { user, isAdmin } = useUser();
    const { data: prefs } = useMyPreferences();
    const { data: facts } = useCountryFacts(code);

    // Prefer the destination's OWN tags (city / place) over the country's.
    // Only when the tags actually describe this locale can we trust a "might
    // not satisfy" miss — a country page always does; a city/place page does
    // only once it has its own tags, otherwise it borrows the country's and we
    // suppress misses (that's what made Hawaii read "might not satisfy beaches"
    // off the USA's tags).
    const localeTags = greatFor && greatFor.length > 0 ? greatFor : undefined;
    const tags = localeTags ?? facts?.greatFor ?? [];
    const tagsDescribeDestination = kind === 'country' || Boolean(localeTags);

    const match =
        user && prefs
            ? computeDestinationMatch(prefs.interests ?? [], tags, costLevel)
            : null;

    // Pro "personal take" — an AI opinion layered on the deterministic match.
    // Gated to paid/admin (backend enforces too); only fetched once there's a
    // match to accompany, and cached server-side per user+destination.
    const isPro = Boolean(user?.isPaidMember) || isAdmin;
    const fit = useDestinationFit(
        match && isPro ? { name, country, kind } : null
    );

    // Logged out, no saved interests, or nothing meaningful to match on → the
    // plain "Great for" chips (unchanged behavior).
    if (!match) return <GreatForSection code={code} greatFor={greatFor} />;

    const label = (slug: string) =>
        t(`match.interests.${slug}`, { defaultValue: slug });

    const renderGroup = (
        slugs: string[],
        groupLabel: string,
        variant: 'match' | 'miss'
    ) =>
        slugs.length > 0 && (
            <div className="match-group">
                <span className="match-group-label">{groupLabel}</span>
                <ul className="match-list">
                    {slugs.map((slug) => (
                        <li
                            key={slug}
                            className={`match-item is-${variant}`}
                            tabIndex={0}
                            // Prefix the group context so the match/miss meaning
                            // (conveyed visually by the check/cross icon) is also
                            // announced — "Because you like: Foodie" vs
                            // "Might not satisfy: Beaches".
                            aria-label={`${groupLabel}: ${label(slug)}`}
                        >
                            {variant === 'match' ? (
                                <CheckRoundedIcon className="match-icon" />
                            ) : (
                                <CloseRoundedIcon className="match-icon" />
                            )}
                            <span className="match-emoji" aria-hidden>
                                {INTEREST_EMOJI[slug]}
                            </span>
                            <span className="match-text">{label(slug)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );

    return (
        <DetailSection
            className="match-for-you-section"
            title={t('match.title')}
            icon={<FavoriteRoundedIcon />}
            contentRead="items"
        >
            <div
                className="match-score"
                role="group"
                tabIndex={0}
                aria-label={`${match.score}% ${t('match.matchLabel')}`}
            >
                <span className="match-score-pct">{match.score}%</span>
                <span className="match-score-label">{t('match.matchLabel')}</span>
            </div>
            {renderGroup(match.matched, t('match.because'), 'match')}
            {/* Misses only render when the tags actually describe THIS
                destination — a country page always, or a city/place once it has
                its own tags. A city/place falling back to the country's tags
                suppresses them (that's what made Hawaii read "might not satisfy
                beaches" off the USA's tags). See `tagsDescribeDestination`. */}
            {tagsDescribeDestination &&
                renderGroup(match.mismatched, t('match.mightNot'), 'miss')}

            {fit.data ? (
                <div
                    className="match-take"
                    role="group"
                    tabIndex={0}
                    aria-label={`${t('match.takeLabel')}: ${fit.data}`}
                >
                    <div className="match-take-header">
                        <AutoAwesomeRoundedIcon className="match-take-icon" />
                        <span className="match-take-label">
                            {t('match.takeLabel')}
                        </span>
                        <span className="match-take-pro">{t('match.pro')}</span>
                    </div>
                    <p className="match-take-text">{fit.data}</p>
                </div>
            ) : (
                fit.isLoading && (
                    <p className="match-take-loading">
                        {t('match.takeLoading')}
                    </p>
                )
            )}
        </DetailSection>
    );
};

export default MatchForYouSection;
