/**
 * "Similar to your saves" — ML-driven homepage section.
 *
 * Backed by chroma + sentence-transformers on the backend. The kNN
 * query runs against a `places` collection seeded from cached
 * recommendation results; the user's taste vector is the average of
 * their saved-place embeddings. Already-saved + already-visited
 * places are filtered server-side so the box only ever shows fresh
 * suggestions.
 *
 * Self-hides on empty / error so a new account or one with no
 * embedded saves doesn't see a dead section.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PlaceCard from 'components/common/PlaceCard';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import type { SimilarPlaceItem } from 'api/similarToSavesApi';
import { useSimilarToSaves } from 'api/hooks/useSimilarToSaves';
import { useUser } from 'context/UserContext';
import { placeDetailUrl } from 'utils/placeUrl';
import { NO_IMAGE } from 'constants';
import './index.scss';

const cardKey = (item: SimilarPlaceItem) => item.placeKey;

// Go-direct: these come with city + country, so skip the recommender hop.
const linkFor = (item: SimilarPlaceItem): string =>
    placeDetailUrl(item.name, item.city, item.country);

const SimilarToSaves = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useSimilarToSaves();

    if (!user) return null;

    if (isLoading) {
        return (
            <section className="similar-to-saves" aria-live="polite">
                <div className="sts-header">
                    <h2 className="sts-title">
                        {t('homeCards.similarToSaves.title')}
                    </h2>
                    <span className="sts-subtitle">
                        {t('homeCards.similarToSaves.subtitle')}
                    </span>
                </div>
                <div className="sts-grid">
                    <PlaceCardSkeleton count={6} />
                </div>
            </section>
        );
    }

    if (isError || !data || data.items.length === 0) return null;

    return (
        <section className="similar-to-saves">
            <div className="sts-header">
                <h2 className="sts-title">
                    {t('homeCards.similarToSaves.title')}
                </h2>
                <span className="sts-subtitle">
                    {t('homeCards.similarToSaves.subtitle')}
                </span>
            </div>
            <div className="sts-grid">
                {data.items.map((item) => (
                    <PlaceCard
                        key={cardKey(item)}
                        place={{
                            id: cardKey(item),
                            name: item.name,
                            country: [item.city, item.country]
                                .filter(Boolean)
                                .join(', '),
                            image: item.imageUrl ?? NO_IMAGE,
                            // Surface either the best-time-to-visit
                            // string (if the metadata had one) or a
                            // similarity-driven blurb. The similarity
                            // score is in [0, 1]; ≥ 0.7 is a strong
                            // match in cosine-distance land.
                            tagline: item.bestTimeToVisit
                                ? t('homeCards.common.bestTime', {
                                      time: item.bestTimeToVisit,
                                  })
                                : item.similarity >= 0.7
                                  ? t('homeCards.similarToSaves.strongMatch')
                                  : t('homeCards.similarToSaves.worthALook'),
                        }}
                        onClick={() => navigate(linkFor(item))}
                    />
                ))}
            </div>
        </section>
    );
};

export default SimilarToSaves;
