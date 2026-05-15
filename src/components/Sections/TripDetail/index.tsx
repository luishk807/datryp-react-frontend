import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { produce } from "immer";
import "./index.scss";
import { Grid } from "@mui/material";
import Layout from "components/common/Layout/SubLayout";
import BasicTripInfo from "components/BasicTripInfo";
import BudgetSummary from "components/BudgetSummary";
import DestinationDetail from "components/DestinationDetail";
import { useUser } from "context/UserContext";
import { basicInfo, useTripDispatch } from "context/TripContext";
import {
  useDeleteItinerary,
  useMyItineraries,
  useSaveItinerary,
} from "api/hooks/useItineraries";
import {
  apiIsSingleTrip,
  apiToTripState,
  isCurrentUserOrganizer,
} from "utils/itineraryAdapter";
import { tripStateToSaveInput } from "utils/tripMapper";
import { TRIP_BASIC, TRIP_STATUS } from "constants";
import { exportTripToExcel } from "utils/exportTripExcel";
import type { BudgetEntry, TripPlaceEvent, TripState, TripStatus } from "types";

// "Confirmed" and beyond are read-only — once a trip is locked in, edits
// require flipping back to Planning (which itself requires unconfirming
// every activity, enforced by the status modal).
const LOCKED_STATUS_NAMES = new Set<string>([
  TRIP_STATUS.CONFIRMED,
  TRIP_STATUS.COMPLETED,
  TRIP_STATUS.CANCELLED,
]);

export const TripDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useTripDispatch();
  const { user: currentUser } = useUser();
  const idParam = searchParams.get("id");

  const { data: apiItineraries = [], isLoading } = useMyItineraries();

  const apiTrip = useMemo(() => {
    if (!idParam) return undefined;
    return apiItineraries.find((t) => t.id === idParam);
  }, [apiItineraries, idParam]);

  const baseTripData = useMemo(
    () => (apiTrip ? apiToTripState(apiTrip) : null),
    [apiTrip],
  );

  // Local copy of the trip so in-place edits (e.g. budget) reflect in the UI
  // immediately, before the saveItinerary mutation round-trips. We re-sync
  // whenever the server-derived `baseTripData` changes (refetch after save).
  const [localTripData, setLocalTripData] = useState<TripState | null>(null);
  useEffect(() => {
    setLocalTripData(baseTripData);
  }, [baseTripData]);

  const [statusOverride, setStatusOverride] = useState<TripStatus | null>(null);

  const tripData = useMemo<TripState | null>(() => {
    if (!localTripData) return null;
    return statusOverride
      ? { ...localTripData, status: statusOverride }
      : localTripData;
  }, [localTripData, statusOverride]);

  const saveItinerary = useSaveItinerary();
  const deleteItinerary = useDeleteItinerary();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dirty when the user has changed budgets/places (localTripData diverges
  // from the server-derived baseTripData) or picked a new status badge.
  const isDirty =
    (!!baseTripData && localTripData !== baseTripData) || statusOverride !== null;

  const handleChangeBudget = useCallback(
    (event: TripPlaceEvent) => {
      const { activity } = event;
      const { type, value, destinationIndx } = activity;
      if (type !== "add") return;
      const { activityId, value: entries } = value as {
        activityId: number;
        value: BudgetEntry[];
      };
      const destIndx = destinationIndx ?? 0;

      setLocalTripData((prev) => {
        if (!prev) return prev;
        return produce(prev, (draft) => {
          const dest = draft.destinations?.[destIndx];
          if (!dest?.itinerary) return;
          for (const day of dest.itinerary) {
            const a = day.activities?.find((x) => x.id === activityId);
            if (a) {
              a.budget = entries.map((b, i) => ({
                id: i + 1,
                user: b.user,
                budget: b.budget,
              }));
              return;
            }
          }
        });
      });
    },
    [],
  );

  const handleSaveTrip = useCallback(async () => {
    if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return;
    setSaveError(null);
    try {
      const input = tripStateToSaveInput(tripData, {
        id: apiTrip.id,
        interaryTypeId: apiTrip.interaryType.id,
        tripStatusId: statusOverride?.id
          ? String(statusOverride.id)
          : apiTrip.status?.id ?? null,
      });
      await saveItinerary.mutateAsync(input);
      // Cache invalidation triggers a refetch; baseTripData updates and the
      // useEffect resyncs localTripData. Clear the status override so the
      // re-rendered badge reflects the freshly-saved status.
      setStatusOverride(null);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save the trip.",
      );
    }
  }, [apiTrip, tripData, statusOverride, saveItinerary]);

  const handleDeleteTrip = useCallback(async () => {
    if (!apiTrip) return;
    setSaveError(null);
    try {
      await deleteItinerary.mutateAsync(apiTrip.id);
      // Trip is gone — drop the user back at the trips list.
      navigate("/trips");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete the trip.",
      );
    }
  }, [apiTrip, deleteItinerary, navigate]);

  const isOrganizer = useMemo(
    () => isCurrentUserOrganizer(apiTrip, currentUser?.id),
    [apiTrip, currentUser?.id],
  );

  const isLocked = !!(
    apiTrip?.status?.name && LOCKED_STATUS_NAMES.has(apiTrip.status.name)
  );

  // Owner / organizer can edit while the trip is in Planning. Confirmed and
  // beyond are read-only for everyone (matches the backend lifecycle).
  const isViewMode = !isOrganizer || isLocked;
  const canExport = isLocked;

  const handleChangeStep = () => {
    if (!tripData || !apiTrip) return;
    dispatch(basicInfo(tripData));
    const route = apiIsSingleTrip(apiTrip)
      ? TRIP_BASIC.SINGLE.route
      : TRIP_BASIC.MULTIPLE.route;
    // Pass the backend id in the URL so the editor knows it's editing an
    // existing trip (refresh-survival, and StepperComp picks data.apiId up
    // from TripContext to make Save Changes UPDATE instead of duplicate).
    navigate(`${route}?id=${apiTrip.id}`);
  };

  const handleExportExcel = () => {
    if (!tripData) return;
    void exportTripToExcel(tripData);
  };

  if (isLoading) {
    return (
      <Layout title="Trip Detail">
        <div className="trip-detail-empty">
          <p>Loading trip…</p>
        </div>
      </Layout>
    );
  }

  if (!apiTrip || !tripData) {
    return (
      <Layout title="Trip Detail">
        <div className="trip-detail-empty">
          <p>Trip not found.</p>
        </div>
      </Layout>
    );
  }

  const participants = tripData.friends ?? [];
  const destinations = tripData.destinations ?? [];

  return (
    <Layout title="Trip Detail">
      <Grid container>
        <Grid item lg={12} md={12} xs={12}>
          <BasicTripInfo
            isViewMode={isViewMode}
            data={tripData}
            onChangeStep={handleChangeStep}
            onStatusChange={setStatusOverride}
            onExportExcel={canExport ? handleExportExcel : undefined}
            onSaveTrip={!isViewMode ? handleSaveTrip : undefined}
            onDeleteTrip={isOrganizer ? handleDeleteTrip : undefined}
            isSaving={saveItinerary.isPending}
            isDeleting={deleteItinerary.isPending}
            isDirty={isDirty}
            saveError={saveError}
          />
        </Grid>
        <Grid item lg={12} md={12} xs={12}>
          <BudgetSummary data={tripData} />
        </Grid>
        <Grid item lg={12}>
          <DestinationDetail
            type={tripData.type}
            isViewMode={isViewMode}
            startDate={tripData.startDate}
            participants={participants}
            endDate={tripData.endDate}
            destinations={destinations}
            onChangePlace={() => {}}
            onChangeBudget={handleChangeBudget}
          />
        </Grid>
      </Grid>
    </Layout>
  );
};

export default TripDetail;
