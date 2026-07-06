import './index.scss';
import { useTranslation } from 'react-i18next';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import GreatForSection from 'components/PlaceDetail/GreatForSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';
import { useMyPreferences } from 'api/hooks/useMyPreferences';
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
}

/**
 * "Is this right for you?" sidebar widget. A logged-in traveler with saved
 * interests gets a personalized match — a %, the interests this destination
 * meets, and any specific ones it may not — computed ENTIRELY client-side from
 * their preferences × the destination's "Great for" tags, so it costs no API
 * call. Everyone else (logged out, or no interests saved, or nothing to match
 * on) falls back to the plain "Great for" chips, unchanged.
 */
const MatchForYouSection = ({ code, costLevel }: MatchForYouSectionProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
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
            {renderGroup(match.mismatched, t('match.mightNot'), 'miss')}
        </DetailSection>
    );
};

export default MatchForYouSection;
