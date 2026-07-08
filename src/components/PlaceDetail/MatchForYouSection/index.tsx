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
}: MatchForYouSectionProps) => {
    const { t } = useTranslation();
    const { user, isAdmin } = useUser();
    const { data: prefs } = useMyPreferences();
    const { data: facts } = useCountryFacts(code);

    const match =
        user && prefs
            ? computeDestinationMatch(
                  prefs.interests ?? [],
                  facts?.greatFor ?? [],
                  costLevel
              )
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
    if (!match) return <GreatForSection code={code} />;

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
                        <li key={slug} className={`match-item is-${variant}`}>
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
        >
            <div className="match-score">
                <span className="match-score-pct">{match.score}%</span>
                <span className="match-score-label">{t('match.matchLabel')}</span>
            </div>
            {renderGroup(match.matched, t('match.because'), 'match')}
            {/* "Might not satisfy" misses are only trustworthy on the COUNTRY
                page, where the "Great for" tags actually describe the
                destination. City / place pages borrow their COUNTRY's tags
                (there are no city-level tags), so a miss there answers "is this
                a top vibe for the whole country?" — not "does this city lack
                it?". That produced nonsense like Hawaii (code=US) reading
                "might not satisfy beaches" off the USA's tags. Positives stay as
                a rough proxy; misses are suppressed until per-city/place tags
                exist. */}
            {kind === 'country' &&
                renderGroup(match.mismatched, t('match.mightNot'), 'miss')}

            {fit.data ? (
                <div className="match-take">
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
