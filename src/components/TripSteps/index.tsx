import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import './index.scss';

import Layout from 'components/common/Layout/SubLayout';
import DestinationDetail from 'components/DestinationDetail';
import StepperComp from 'components/common/StepperComp';
import BasicInfo from 'components/DestinationDetail/BasicInfo';
import BasicsStep from 'components/TripSteps/BasicsStep';
import PeopleStep from 'components/TripSteps/PeopleStep';
import ParticipantsStep from 'components/TripSteps/ParticipantsStep';
import TripTour, {
    TRIP_TOUR_STORAGE_KEY,
    type TripTourStep,
} from 'components/TripTour';
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
    const [searchParams] = useSearchParams();
    const editingId = searchParams.get('id');

    // Onboarding tour state. Runs automatically the first time a
    // logged-in user lands on the create-trip wizard (no `?id=`), and
    // is re-runnable from the "Take the tour" button in the wizard
    // header. The localStorage flag is set once the tour closes —
    // skip, finish, or close all count as "seen" so we don't nag a
    // user who already dismissed it. The "Take the tour" button
    // re-opens the tour for the CURRENT wizard step, so a user on the
    // People or Itinerary screen gets the right tooltips.
    const [tourRun, setTourRun] = useState(false);
    const [tourWizardStep, setTourWizardStep] = useState<TripTourStep>(0);
    useEffect(() => {
        if (!user) return;
        if (editingId) return;
        if (typeof window === 'undefined') return;
        if (window.localStorage.getItem(TRIP_TOUR_STORAGE_KEY) === '1') return;
        const handle = window.setTimeout(() => setTourRun(true), 400);
        return () => window.clearTimeout(handle);
    }, [user, editingId]);

    const handleTourClose = () => {
        setTourRun(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(TRIP_TOUR_STORAGE_KEY, '1');
        }
    };

    const handleTourStart = () => setTourRun(true);

    // Mirror StepperComp's internal activeStep into local state so we
    // can pass it to TripTour. The callback fires on every step
    // change. Clamped to 0/1/2 because TripTour only knows about the
    // three create-flow steps (the trailing "Finish" indicator and
    // the post-save "TripComplete" screen don't get their own tour).
    const handleActiveStepChange = (step: number) => {
        const clamped = Math.max(0, Math.min(2, step)) as TripTourStep;
        setTourWizardStep(clamped);
    };

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

    // Pre-seed the current user as an organizer AND as a participant
    // (friend) once per mount. We deliberately don't watch
    // `tripInfo.organizer` / `tripInfo.friends` here — otherwise
    // removing yourself would trigger this effect and re-add you,
    // making de-select impossible.
    const seededRef = useRef(false);
    useEffect(() => {
        if (!user || seededRef.current) return;
        seededRef.current = true;
        const selfAsFriend: Friend = {
            id: hashUuid(user.id),
            label: `${user.name} (you)`,
            name: `${user.name} (you)`,
            userId: user.id,
        };
        const currentOrganizers = tripInfo.organizer ?? [];
        const currentFriends = tripInfo.friends ?? [];
        const patch: Partial<typeof tripInfo> = {};
        if (!currentOrganizers.some((o) => o.userId === user.id)) {
            patch.organizer = [...currentOrganizers, selfAsFriend];
        }
        if (!currentFriends.some((f) => f.userId === user.id)) {
            patch.friends = [...currentFriends, selfAsFriend];
        }
        if (Object.keys(patch).length) dispatch(basicInfo(patch));
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

    // Seed `tripInfo.type` from the URL the user entered on (/single or
    // /multiple), but only if context doesn't already have a type. The
    // mode picker on step 1 can override this freely.
    const typeSeededRef = useRef(false);
    useEffect(() => {
        if (typeSeededRef.current) return;
        typeSeededRef.current = true;
        if (tripInfo.type) return;
        const seed =
            currentType === TRIP_MODE.SINGLE
                ? TRIP_BASIC.SINGLE
                : TRIP_BASIC.MULTIPLE;
        dispatch(basicInfo({ type: seed }));
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

    const isEditing = Boolean(editingId);

    // Whether the wizard entered with a country already saved (set by AI
    // search / top-place / country-detail entry points). Snapshotted at
    // mount so picking a country later doesn't make the destination step
    // vanish under the user. Edit mode never shows the step at all.
    const enteredWithCountryRef = useRef<boolean | null>(null);
    if (enteredWithCountryRef.current === null) {
        enteredWithCountryRef.current = Boolean(
            tripInfo.destinations?.[0]?.country?.id ||
                tripInfo.destinations?.[0]?.country?.name
        );
    }
    const needsDestinationStep =
        !isEditing &&
        !enteredWithCountryRef.current &&
        tripInfo.type?.id === TRIP_BASIC.SINGLE.id;

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

    // New 3-step create flow: Basics (mode + destination + dates + budget),
    // People (organizers + participants), Itinerary. Edit mode still uses
    // the legacy 3-step shape because StepperComp slices [0, 1] into the
    // edit-modal and [2..] inline — keep those indices stable.
    const steps = isEditing
        ? [
              {
                  label: 'Describe Your Trip!',
                  comp: <BasicInfo data={tripInfo} onChange={onBasicChange} />,
              },
              {
                  label: 'Participants',
                  comp: (
                      <ParticipantsStep
                          data={tripInfo}
                          onChange={onBasicChange}
                      />
                  ),
              },
              {
                  label: 'Activities',
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
                          lockActivityStatus={!tripInfo.apiId}
                          // Forward the trip's lifecycle name to
                          // DateBlock so the date dot / rail / soft
                          // fill behind activities recolor to match
                          // status (orange for Planning, etc.).
                          // Without this, DateBlock defaulted to
                          // status-confirmed (green) in the stepper
                          // edit view.
                          tripStatusName={
                              tripInfo.status &&
                              typeof tripInfo.status === 'object'
                                  ? tripInfo.status.name
                                  : undefined
                          }
                      />
                  ),
              },
          ]
        : [
              {
                  label: 'Trip basics',
                  comp: (
                      <BasicsStep
                          data={tripInfo}
                          onChange={onBasicChange}
                          showDestination={needsDestinationStep}
                      />
                  ),
              },
              {
                  label: 'People',
                  comp: (
                      <PeopleStep
                          data={tripInfo}
                          onChange={onBasicChange}
                      />
                  ),
              },
              {
                  label: 'Itinerary',
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
                          // Lock the per-activity Planning/Confirmed pill
                          // while creating a brand-new trip — activities
                          // are always Planning until the trip is saved
                          // (apiId materializes).
                          lockActivityStatus={!tripInfo.apiId}
                      />
                  ),
              },
          ];

    return (
        <Layout
            // In edit mode the standalone trip header (rendered inside
            // StepperComp) carries the trip name + actions; suppress
            // Layout's own title row so the page doesn't carry a
            // redundant "Single Trip Detail (EDIT MODE)" banner above
            // the trip header.
            title={isEditing ? '' : title}
        >
            <Grid container className={containerClassName}>
                {!isEditing && (
                    <Grid item lg={12} md={12} xs={12}>
                        <div className="trip-tour-launcher">
                            <button
                                type="button"
                                className="trip-tour-launcher-btn"
                                onClick={handleTourStart}
                                aria-label="Show me how to plan a trip"
                                title="Show me how to plan a trip"
                            >
                                <HelpOutlineRoundedIcon fontSize="small" />
                                <span>Take the tour</span>
                            </button>
                        </div>
                    </Grid>
                )}
                <Grid item lg={12} md={12} xs={12}>
                    <StepperComp
                        data={tripInfo}
                        steps={steps}
                        onActiveStepChange={handleActiveStepChange}
                    />
                </Grid>
            </Grid>
            <TripTour
                run={tourRun}
                wizardStep={tourWizardStep}
                onClose={handleTourClose}
            />
        </Layout>
    );
};

export default TripSteps;
