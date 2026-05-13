import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid } from '@mui/material';
import classnames from 'classnames';
import Layout from 'components/common/Layout/SubLayout';
import TripBox, { type TripBoxData } from 'components/common/TripBox';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useMyItineraries } from 'api/hooks/useItineraries';
import { apiToTripEntry } from 'utils/itineraryAdapter';
import './index.scss';

type FilterValue = 'all' | 'planning' | 'confirmed' | 'completed';

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'planning', label: 'Planning' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
];

export const Trips = () => {
    const [filter, setFilter] = useState<FilterValue>('all');
    const navigate = useNavigate();
    const { data: apiItineraries = [], isLoading, isError } = useMyItineraries();

    // Convert API itineraries to the legacy TripBoxData shape. Each entry
    // carries an `apiId` (UUID) so TripDetail can look it up later.
    const allTrips = useMemo(() => {
        return apiItineraries.map((it) => {
            const entry = apiToTripEntry(it) as TripBoxData & { apiId: string };
            return entry;
        });
    }, [apiItineraries]);

    const counts = useMemo(() => {
        const c: Record<FilterValue, number> = {
            all: allTrips.length,
            planning: 0,
            confirmed: 0,
            completed: 0,
        };
        allTrips.forEach((t) => {
            const key = t.status.name.toLowerCase() as FilterValue;
            if (key in c) c[key]++;
        });
        return c;
    }, [allTrips]);

    const filteredTrips = useMemo(() => {
        if (filter === 'all') return allTrips;
        return allTrips.filter((t) => t.status.name.toLowerCase() === filter);
    }, [filter, allTrips]);

    return (
        <Layout title="My Trips">
            <div className="trips-page">
                <div className="trips-header">
                    <div className="trips-summary">
                        <span className="trips-count">
                            {allTrips.length} trip{allTrips.length === 1 ? '' : 's'}
                        </span>
                        {counts.planning > 0 && (
                            <span className="trips-summary-item">
                                · {counts.planning} planning
                            </span>
                        )}
                        {counts.confirmed > 0 && (
                            <span className="trips-summary-item">
                                · {counts.confirmed} confirmed
                            </span>
                        )}
                        {counts.completed > 0 && (
                            <span className="trips-summary-item">
                                · {counts.completed} completed
                            </span>
                        )}
                    </div>
                    <div className="trips-cta">
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            label="+ Plan new trip"
                            onClick={() => navigate('/')}
                        />
                    </div>
                </div>

                <div className="trips-filters">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            className={classnames('trips-filter', {
                                active: filter === f.value,
                            })}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                            <span className="trips-filter-count">
                                {counts[f.value]}
                            </span>
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="trips-empty">
                        <p>Loading trips…</p>
                    </div>
                ) : isError ? (
                    <div className="trips-empty">
                        <p>Couldn't load your trips. Is the backend running?</p>
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <div className="trips-empty">
                        <p>No trips in this category yet.</p>
                    </div>
                ) : (
                    <Grid container id="trip-container">
                        {filteredTrips.map((trip) => (
                            <Grid
                                key={(trip as { apiId?: string }).apiId ?? trip.id}
                                item
                                lg={4}
                                md={6}
                                xs={12}
                                className="trip-item"
                            >
                                <TripBox
                                    data={trip}
                                    to={`/trip-detail?id=${(trip as { apiId?: string }).apiId ?? trip.id}`}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </div>
        </Layout>
    );
};

export default Trips;
