/**
 * "Best for <Next Month>" — homepage section surfacing destinations the
 * user has already saved (places / cities / countries) where the
 * upcoming month falls inside the `best_time_to_visit` window. Hides
 * itself entirely when:
 *   - viewer is anonymous (the endpoint requires auth)
 *   - the backend errored (no point showing a broken section)
 *   - the user has zero matching saves for next month
 *
 * Card-click semantics are kind-dependent because the source data spans
 * three different surfaces:
 *   - place   → go-direct `/place?q=<name>&city=&country=` (skips the
 *                                              recommender discovery hop)
 *   - city    → `/city?name=...&country=...&code=...&mode=single`
 *   - country → `/country?code=<code>`
 *
 * Mirrors `PlacesYouMightLove`'s layout (shared `PlaceCard`, same grid
 * class) so the two homepage sections feel like a coherent set.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PlaceCard from 'components/common/PlaceCard';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import type { NextMonthPickItem } from 'api/nextMonthPicksApi';
import { useNextMonthPicks } from 'api/hooks/useNextMonthPicks';
import { useUser } from 'context/UserContext';
import { placeDetailUrl } from 'utils/placeUrl';
import { NO_IMAGE } from 'constants';
import './index.scss';

const cardKey = (item: NextMonthPickItem) => `${item.kind}--${item.key}`;

const linkFor = (item: NextMonthPickItem): string => {
    if (item.kind === 'place') {
        // Go-direct when the saved place carries city + country (skips the
        // recommender discovery hop); placeDetailUrl falls back to the
        // name-search link for legacy cached rows missing those fields.
        return placeDetailUrl(item.name, item.city, item.country);
    }
    if (item.kind === 'country') {
        // The country dispatch happens by ISO alpha-2 code; the
        // /country page reads `code` and looks the row up from the
        // seed catalog. No name needed.
        return `/country?code=${encodeURIComponent(
            item.countryCode || item.key,
        )}`;
    }
    // City — pack name + country into the link so the /city page can
    // resolve the city_details cache slug without an extra round-trip.
    // The `location` field came back as "Country (CC)" — split on the
    // first " (" to recover the bare country name; fall back to the
    // whole string if the split doesn't apply.
    const [country] = (item.location || '').split(' (');
    return (
        `/city?name=${encodeURIComponent(item.name)}` +
        `&country=${encodeURIComponent(country.trim())}` +
        `&code=${encodeURIComponent(item.countryCode || '')}` +
        `&mode=single`
    );
};

const NextMonthPicks = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useNextMonthPicks();

    if (!user) return null;

    // Loading skeleton — match the production layout's card count so
    // the grid doesn't reshape on data arrival. We don't know the
    // upcoming month yet at this stage, so the title is a neutral
    // placeholder.
    if (isLoading) {
        return (
            <section className="next-month-picks" aria-live="polite">
                <div className="nmp-header">
                    <h2 className="nmp-title">
                        {t('homeCards.nextMonthPicks.loadingTitle')}
                    </h2>
                    <span className="nmp-subtitle">
                        {t('homeCards.nextMonthPicks.loadingSubtitle')}
                    </span>
                </div>
                <div className="nmp-grid">
                    <PlaceCardSkeleton count={6} />
                </div>
            </section>
        );
    }

    // Three "show nothing" cases collapse to the same branch: a broken
    // backend, a brand-new user with no saves, and a user whose every
    // save falls outside next month. Empty homepage > broken homepage.
    if (isError || !data || data.items.length === 0) return null;

    return (
        <section className="next-month-picks">
            <div className="nmp-header">
                <h2 className="nmp-title">
                    {t('homeCards.nextMonthPicks.title', {
                        month: data.monthLabel,
                    })}
                </h2>
                <span className="nmp-subtitle">
                    {t('homeCards.nextMonthPicks.subtitle')}
                </span>
            </div>
            <div className="nmp-grid">
                {data.items.map((item) => (
                    <PlaceCard
                        key={cardKey(item)}
                        place={{
                            id: cardKey(item),
                            name: item.name,
                            country: item.location,
                            image: item.imageUrl ?? NO_IMAGE,
                            // Surface the original best-time string as
                            // the tagline so the user sees the "why
                            // now" rationale on the card itself.
                            tagline: t('homeCards.common.bestTime', {
                                time: item.bestTimeToVisit,
                            }),
                        }}
                        onClick={() => navigate(linkFor(item))}
                    />
                ))}
            </div>
        </section>
    );
};

export default NextMonthPicks;
