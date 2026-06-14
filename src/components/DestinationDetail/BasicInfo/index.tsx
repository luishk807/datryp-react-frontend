import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { now } from 'utils';
import InputField from 'components/common/FormFields/InputField';
import DropDown from 'components/common/FormFields/DropDown';
import FriendPicker from '../FriendPicker';
import SearchBar from 'components/SearchBar';
import BudgetSuggestionBadge from 'components/BudgetSuggestionBadge';
import { basicInfo, useTripDispatch } from 'context/TripContext';
import { useTripStatuses } from 'api/hooks/useLookups';
import { useUser } from 'context/UserContext';
import { useBudgetSuggestion } from 'hooks/useBudgetSuggestion';
import { TRIP_BASIC } from 'constants';
import type {
    Country,
    Destination,
    Friend,
    TripChangeEvent,
    TripState,
} from 'types';

interface BasicInfoProps {
    onChange: (id: string, e: TripChangeEvent) => void;
    data?: TripState | null;
}

const BasicInfo = ({ onChange, data = null }: BasicInfoProps) => {
    const { t } = useTranslation();
    const today = useMemo(() => now(), []);
    const dispatch = useTripDispatch();
    const { user, isLoading: isUserLoading } = useUser();
    const isSingle = data?.type?.id === TRIP_BASIC.SINGLE.id;
    const rootCountry = data?.destinations?.[0]?.country;

    // Backend-sourced trip statuses — their UUIDs match what apiToTripState
    // stamps onto data.status when editing an existing trip. We resolve the
    // current status by name (handles both API-derived statuses with UUIDs
    // and any legacy numeric-id status objects from older flows).
    const { data: tripStatuses = [] } = useTripStatuses();
    const resolvedStatus = useMemo(() => {
        if (!tripStatuses.length) return null;
        const raw = data?.status;
        if (!raw) return tripStatuses[0];
        const targetName = typeof raw === 'object' ? raw.name : null;
        if (!targetName) return tripStatuses[0];
        return tripStatuses.find((s) => s.name === targetName) ?? tripStatuses[0];
    }, [data?.status, tripStatuses]);

    // Single trips carry exactly one country at destinations[0].country. The
    // wizard step 2 / read views don't expose a country picker for singles
    // (only multis have AddDestinationBtn), so we surface it here so the
    // user can change destination after the trip exists.
    const handleCountryChange = (country: Country) => {
        const destinations = data?.destinations ?? [];
        const next: Destination[] =
            destinations.length > 0
                ? [
                      { ...destinations[0], country },
                      ...destinations.slice(1),
                  ]
                : [{ id: 0, country, itinerary: [] } as Destination];
        dispatch(basicInfo({ destinations: next }));
    };

    const view = useMemo(
        () => ({
            organizer: (data?.organizer ?? []) as Friend[],
            name: data?.name ?? '',
            budget: data?.budget ?? '',
            startDate: data?.startDate ?? today,
            endDate: data?.endDate ?? today,
        }),
        [data, today]
    );

    const selectedCountries = useMemo(() => {
        const names = (data?.destinations ?? [])
            .map((d) => d.country?.name)
            .filter((n): n is string => !!n);
        return Array.from(new Set(names));
    }, [data]);

    // AI budget reference for the Edit Trip Info modal — read-only
    // (autoFill: false). The user's saved budget is the source of
    // truth; we just surface what the AI would suggest as a comparison
    // figure under the input. Mirrors BasicsStep's badge so editing
    // and creating feel consistent. Days derived from the trip's
    // start/end (inclusive), capped at 90 to match the BE.
    const tripDays = (() => {
        const s = data?.startDate;
        const e = data?.endDate;
        if (!s || !e) return null;
        const ms =
            new Date(e).getTime() - new Date(s).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
        return days >= 1 && days <= 90 ? days : null;
    })();
    const budgetCurrent = String(data?.budget ?? '');
    const { suggestion: budgetSuggestion, isLoading: isBudgetSuggestionLoading, inputMatchesAi: budgetMatchesAi } =
        useBudgetSuggestion({
            countryCode: rootCountry?.code ?? null,
            city: null,
            days: tripDays,
            startDate: data?.startDate ?? null,
            travelStyle: user?.travelerStyles?.[0] ?? null,
            homeCountryCode: user?.homeCountryCode ?? null,
            homeCity: user?.homeCity ?? null,
            enabled: !isUserLoading,
            currentBudget: budgetCurrent,
            autoFill: false,
        });

    useEffect(() => {
        if (!data?.startDate) onChange('startDate', { target: { value: today } });
        if (!data?.endDate) onChange('endDate', { target: { value: today } });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOrganizerPicker = (_name: string | undefined, e: TripChangeEvent) => {
        onChange('organizer', e);
    };

    const handleStatusChange = (value: unknown) => {
        onChange('status', { target: { value } });
    };

    return (
        <div>
            <form>
                <Grid container className="step-section">
                    <Grid item lg={12} md={12} xs={12} className="header">
                        {t('activity.basicInfo.header')}
                    </Grid>
                    {isSingle ? (
                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <SearchBar
                                defaultValue={rootCountry?.name ? rootCountry : null}
                                type="simple"
                                onSelected={handleCountryChange}
                            />
                        </Grid>
                    ) : (
                        selectedCountries.length > 0 && (
                            <Grid item lg={12} md={12} xs={12} className="trip-destination-card">
                                <FlightTakeoffIcon className="trip-destination-icon" />
                                <div className="trip-destination-text">
                                    <span className="trip-destination-label">
                                        {selectedCountries.length > 1
                                            ? t('activity.basicInfo.headingTo')
                                            : t('activity.basicInfo.nextStop')}
                                    </span>
                                    <span className="trip-destination-name">
                                        {selectedCountries.join(' • ')}
                                    </span>
                                </div>
                            </Grid>
                        )
                    )}
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <FriendPicker
                            title={t('activity.basicInfo.selectOrganizer')}
                            name="organizer"
                            selectedOptions={view.organizer}
                            onChange={handleOrganizerPicker}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            defaultValue={view.name}
                            name="name"
                            label={t('activity.basicInfo.tripName')}
                            onChange={(e) => onChange('name', e)}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            defaultValue={String(view.budget)}
                            name="budget"
                            label={t('activity.basicInfo.budget')}
                            onChange={(e) => onChange('budget', e)}
                        />
                        <BudgetSuggestionBadge
                            suggestion={budgetSuggestion}
                            isLoading={isBudgetSuggestionLoading}
                            destinationLabel={rootCountry?.name ?? null}
                            inputMatchesAi={budgetMatchesAi}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <DropDown
                            label={
                                data?.apiId
                                    ? t('activity.basicInfo.status')
                                    : t('activity.basicInfo.statusOnCreate')
                            }
                            value={resolvedStatus?.id ?? null}
                            options={tripStatuses}
                            name="status"
                            onChange={handleStatusChange}
                            // Locked while creating the trip — a brand-new
                            // itinerary is always Planning. Status becomes
                            // editable once the trip exists (apiId set) via
                            // this form OR from /trips / /trip-detail.
                            disabled={!data?.apiId}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            label={t('activity.basicInfo.startDate')}
                            defaultValue={view.startDate}
                            name="startDate"
                            type="date"
                            onChange={(e) => onChange('startDate', e)}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="form-input">
                        <InputField
                            label={t('activity.basicInfo.endDate')}
                            defaultValue={view.endDate}
                            name="endDate"
                            type="date"
                            onChange={(e) => onChange('endDate', e)}
                        />
                    </Grid>
                </Grid>
            </form>
        </div>
    );
};

export default BasicInfo;
