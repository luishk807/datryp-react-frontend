import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, IconButton, Tooltip } from '@mui/material';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import './index.scss';
import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import StepperComp from 'components/common/StepperComp';
import BasicInfo from 'components/DestinationDetail/BasicInfo';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import { basicInfo, useTripDispatch, useTripState } from 'context/TripContext';
import { useUser } from 'context/UserContext';
import { useMyItineraries } from 'api/hooks/useItineraries';
import { apiToTripState } from 'utils/itineraryAdapter';
import { status as statusOptions } from 'sample';
import { TRIP_BASIC, TRIP_MODE, TRIP_STATUS } from 'constants';

const PLANNING_STATUS =
    statusOptions.find((s) => s.name === TRIP_STATUS.PLANNING) ?? statusOptions[0];
import type {
    Friend,
    TripChangeEvent,
    TripDestinationEvent,
    TripPlaceEvent,
} from 'types';

const hashUuid = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
};

/** Narrow subset of the shared TripMode — TripSteps edits an existing trip,
 *  so the 'recommend' tab value (homepage-only) is not valid here. */
type EditableTripMode = typeof TRIP_MODE.SINGLE | typeof TRIP_MODE.MULTIPLE;

interface TripStepsProps {
    title: string;
    containerClassName?: string;
    currentType: EditableTripMode;
    onBasicChange: (id: string, e: TripChangeEvent) => void;
    onChangePlace: (event: TripPlaceEvent) => void;
    onChangeBudget: (event: TripPlaceEvent) => void;
    onChangeDestination?: (event: TripDestinationEvent) => void;
}

const TripSteps = ({
    title,
    containerClassName,
    currentType,
    onBasicChange,
    onChangePlace,
    onChangeBudget,
    onChangeDestination,
}: TripStepsProps) => {
    const tripInfo = useTripState();
    const dispatch = useTripDispatch();
    const { user } = useUser();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editingId = searchParams.get('id');

    // When the URL carries ?id=<uuid> we're editing an existing trip. Hydrate
    // TripContext from the API once per id change so refresh-on-/single?id=X
    // and "Edit Trip" both land on the right data. Skipped during the new-
    // trip flow (no `?id=`).
    const { data: apiItineraries = [] } = useMyItineraries({
        enabled: !!editingId,
    });
    useEffect(() => {
        if (!editingId) return;
        if (tripInfo.apiId === editingId) return;
        const apiTrip = apiItineraries.find((t) => t.id === editingId);
        if (!apiTrip) return;
        dispatch(basicInfo(apiToTripState(apiTrip)));
    }, [editingId, apiItineraries, tripInfo.apiId, dispatch]);

    // Clear a stale `apiId` whenever the URL lacks `?id=`. TripContext is
    // persisted to localStorage, so a previous edit session can leak its
    // apiId into a brand-new trip flow — which would falsely flip
    // `!tripInfo.apiId` to false and unlock the activity status pill /
    // trip status dropdown during creation. Only runs once when the URL
    // says "new trip" and the context still claims to be an edit.
    useEffect(() => {
        if (editingId) return;
        if (!tripInfo.apiId) return;
        dispatch(basicInfo({ apiId: undefined }));
    }, [editingId, tripInfo.apiId, dispatch]);

    // Pre-seed the current user as an organizer once per mount. We deliberately
    // don't watch `tripInfo.organizer` here — otherwise removing yourself
    // would trigger this effect and re-add you, making de-select impossible.
    const seededRef = useRef(false);
    useEffect(() => {
        if (!user || seededRef.current) return;
        seededRef.current = true;
        const current = tripInfo.organizer ?? [];
        if (current.some((o) => o.userId === user.id)) return;
        const selfAsFriend: Friend = {
            id: hashUuid(user.id),
            label: `${user.name} (you)`,
            name: `${user.name} (you)`,
            userId: user.id,
        };
        dispatch(basicInfo({ organizer: [...current, selfAsFriend] }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Default the trip status to "Planning" on first mount so the badge in
    // BasicTripInfo reads "Planning" instead of the legacy "Draft" placeholder.
    const statusSeededRef = useRef(false);
    useEffect(() => {
        if (statusSeededRef.current) return;
        statusSeededRef.current = true;
        if (tripInfo.status) return;
        dispatch(basicInfo({ status: PLANNING_STATUS }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-fill the trip name to "<Country> trip" once — the first time a
    // country is picked and the name is empty. After that, the user fully
    // owns the field (clearing it stays cleared, typing custom stays custom).
    const seededNameRef = useRef(false);
    useEffect(() => {
        if (seededNameRef.current) return;
        const firstCountry = tripInfo.destinations?.[0]?.country?.name;
        if (!firstCountry) return;
        if ((tripInfo.name ?? '').trim()) {
            // User already had a name when entering — count that as engagement
            // and don't auto-fill later.
            seededNameRef.current = true;
            return;
        }
        seededNameRef.current = true;
        dispatch(basicInfo({ name: `${firstCountry} trip` }));
    }, [tripInfo.destinations, tripInfo.name, dispatch]);

    const otherMode: EditableTripMode =
        currentType === TRIP_MODE.SINGLE ? TRIP_MODE.MULTIPLE : TRIP_MODE.SINGLE;
    const switchTarget =
        otherMode === TRIP_MODE.SINGLE ? TRIP_BASIC.SINGLE.route : TRIP_BASIC.MULTIPLE.route;
    const switchLabel =
        otherMode === TRIP_MODE.SINGLE ? 'Switch to Single Trip' : 'Switch to Multi Trip';

    const participants = useMemo<Friend[]>(() => {
        const friends = tripInfo.friends || [];
        const organizer = tripInfo.organizer || [];
        const merged = [...friends, ...organizer];

        const unique: Friend[] = [];
        merged.forEach((entry) => {
            if (!unique.find((u) => u.id === entry.id)) {
                unique.push(entry);
            }
        });
        return unique;
    }, [tripInfo]);

    const steps = [
        {
            label: 'Describe Your Trip!',
            comp: <BasicInfo data={tripInfo} onChange={onBasicChange} />,
        },
        {
            label: 'Participants',
            comp: (
                <FriendPicker
                    name="friends"
                    title="participants"
                    selectedOptions={tripInfo.friends}
                    onChange={onBasicChange}
                />
            ),
        },
        {
            label: 'Finish',
            comp: (
                <DestinationDetail
                    type={tripInfo.type}
                    startDate={tripInfo.startDate}
                    participants={participants}
                    endDate={tripInfo.endDate}
                    destinations={tripInfo.destinations}
                    onChangePlace={onChangePlace}
                    onChangeBudget={onChangeBudget}
                    onChangeDestination={onChangeDestination}
                    // Lock the per-activity Planning/Confirmed pill while
                    // creating a brand-new trip — activities are always
                    // Planning until the trip is saved (apiId materializes).
                    lockActivityStatus={!tripInfo.apiId}
                />
            ),
        },
    ];

    const isEditing = Boolean(editingId);

    return (
        <Layout
            // In edit mode the standalone trip header (rendered inside
            // StepperComp) carries the trip name + actions; suppress
            // Layout's own title row so the page doesn't carry a
            // redundant "Single Trip Detail (EDIT MODE)" banner above
            // the trip header.
            title={isEditing ? '' : title}
            titleAction={
                isEditing ? null : (
                    <Tooltip title={switchLabel}>
                        <IconButton
                            size="small"
                            aria-label={switchLabel}
                            onClick={() => navigate(switchTarget)}
                            sx={{ ml: 1 }}
                        >
                            <SyncAltIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )
            }
        >
            <Grid container className={containerClassName}>
                <Grid item lg={12} md={12} xs={12}>
                    <StepperComp data={tripInfo} steps={steps} />
                </Grid>
            </Grid>
        </Layout>
    );
};

export default TripSteps;
