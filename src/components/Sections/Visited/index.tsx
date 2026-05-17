import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import './index.scss';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import Layout from 'components/common/Layout/SubLayout';
import DeleteBtn from 'components/common/DeleteBtn';
import { useUnmarkVisited, useVisitedPlaces } from 'api/hooks/useVisitedPlaces';
import { formatDate } from 'utils/date';
import { BUTTON_VARIANT, VISITED_SOURCE } from 'constants';
import type { VisitedPlace } from 'types';

const sourceLabel = (source: VisitedPlace['source']): string =>
    source === VISITED_SOURCE.ITINERARY ? 'From itinerary' : 'Marked manually';

const Visited = () => {
    const { data, isLoading, isError, error } = useVisitedPlaces();
    const unmarkVisited = useUnmarkVisited();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    // Distinct countries — drives the small "X countries visited" rollup at
    // the top. Uses country_code when available (robust); falls back to the
    // free-string place_country so older rows still count toward the tally.
    const countryCount = useMemo(() => {
        const seen = new Set<string>();
        for (const v of items) seen.add(v.countryCode ?? v.placeCountry);
        return seen.size;
    }, [items]);

    return (
        <Layout title="Visited Places">
            <div className="visited-page">
                <header className="visited-page-header">
                    <h1 className="visited-page-title">Visited Places</h1>
                    {!isLoading && !isError && total > 0 && (
                        <p className="visited-page-summary">
                            {total} place{total === 1 ? '' : 's'} · {countryCount}{' '}
                            countr{countryCount === 1 ? 'y' : 'ies'}
                        </p>
                    )}
                </header>

                {isLoading && <p className="visited-page-msg">Loading…</p>}

                {isError && (
                    <p className="visited-page-msg visited-page-error" role="alert">
                        Could not load your visited list
                        {error instanceof Error ? ` — ${error.message}` : ''}.
                    </p>
                )}

                {!isLoading && !isError && total === 0 && (
                    <div className="visited-page-empty">
                        <CheckCircleRoundedIcon className="visited-page-empty-icon" />
                        <p>You haven't marked any places as visited yet.</p>
                        <p className="visited-page-empty-hint">
                            Find a place you've been on the{' '}
                            <Link to="/">home page</Link> and click{' '}
                            <em>"I've been here"</em>.
                        </p>
                    </div>
                )}

                {!isLoading && !isError && total > 0 && (
                    <ul className="visited-list">
                        {items.map((v) => (
                            <li key={v.id} className="visited-card">
                                <Link
                                    to={`/place?q=${encodeURIComponent(v.placeName)}&i=0`}
                                    className="visited-card-main"
                                >
                                    <PublicRoundedIcon className="visited-card-icon" />
                                    <div className="visited-card-text">
                                        <span className="visited-card-name">
                                            {v.placeName}
                                        </span>
                                        <span className="visited-card-location">
                                            {v.placeCity} · {v.placeCountry}
                                        </span>
                                        <span className="visited-card-meta">
                                            Visited on{' '}
                                            {formatDate(v.visitedAt, 'MMM D, YYYY')}
                                            {' · '}
                                            {sourceLabel(v.source)}
                                        </span>
                                    </div>
                                </Link>
                                <div className="visited-card-actions">
                                    <DeleteBtn
                                        title="Remove from visited"
                                        label="Remove"
                                        targetName={v.placeName}
                                        buttonType={BUTTON_VARIANT.TEXT}
                                        onConfirm={() =>
                                            unmarkVisited.mutate(v.placeKey)
                                        }
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Layout>
    );
};

export default Visited;
