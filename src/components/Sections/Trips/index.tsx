import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid } from '@mui/material';
import classnames from 'classnames';
import Layout from 'components/common/Layout/SubLayout';
import TripBox from 'components/common/TripBox';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { userTrips, type UserTripStatus } from 'sample/userTrips';
import './index.css';

type FilterValue = 'all' | UserTripStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'planning', label: 'Planning' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
];

export const Trips = () => {
    const [filter, setFilter] = useState<FilterValue>('all');
    const navigate = useNavigate();

    const counts = useMemo(() => {
        const c = {
            all: userTrips.length,
            planning: 0,
            confirmed: 0,
            completed: 0,
        };
        userTrips.forEach((t) => {
            c[t.status]++;
        });
        return c;
    }, []);

    const filteredTrips = useMemo(() => {
        if (filter === 'all') return userTrips;
        return userTrips.filter((t) => t.status === filter);
    }, [filter]);

    return (
        <Layout title="My Trips">
            <div className="trips-page">
                <div className="trips-header">
                    <div className="trips-summary">
                        <span className="trips-count">
                            {userTrips.length} trip{userTrips.length === 1 ? '' : 's'}
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

                {filteredTrips.length === 0 ? (
                    <div className="trips-empty">
                        <p>No trips in this category yet.</p>
                    </div>
                ) : (
                    <Grid container id="trip-container">
                        {filteredTrips.map((trip) => (
                            <Grid
                                key={trip.id}
                                item
                                lg={4}
                                md={6}
                                xs={12}
                                className="trip-item"
                            >
                                <TripBox data={trip} />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </div>
        </Layout>
    );
};

export default Trips;
