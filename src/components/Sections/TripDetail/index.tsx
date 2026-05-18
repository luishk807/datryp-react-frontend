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
import { useTripStatuses } from "api/hooks/useLookups";
import {
  apiIsSingleTrip,
  apiToTripState,
  isCurrentUserOrganizer,
} from "utils/itineraryAdapter";
import { tripStateToSaveInput } from "utils/tripMapper";
import { isSameDay } from "utils";
import { TRIP_BASIC, TRIP_STATUS } from "constants";
import { exportTripToExcel } from "utils/exportTripExcel";
import type {
  Activity,
  BudgetEntry,
  TripPlaceEvent,
  TripState,
  TripStatus,
} from "types";

// `LOCKED_STATUS_NAMES` gates *activity editing* — once Confirmed, places
// can't be added/edited/deleted, and budgets become read-only. Trip-level
// transitions (Confirmed → Completed via the Mark Completed button) are
// gated separately by `canMarkCompleted`.
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
  const { data: tripStatuses = [] } = useTripStatuses();
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

  // Apply an add/edit/delete from the activity card chain. Mirrors
  // `handleChangeBudget` — purely local state, picked up by `tripStateToSaveInput`
  // on the next Save Trip. The Activities row already enforces organizer-only
  // via `isViewMode` (the toggle button is disabled when view-mode is on), so
  // we don't re-check permissions here.
  //
  // Event shapes (set by `Activities/index.tsx` -> `DestinationDetail`):
  //  - `add`    : value is a fresh `Activity` draft (no id yet)
  //  - `edit`   : value is `{ index, value: patchOrDraft }` — when patch carries
  //               an `id` (status badge toggle) we match by id, otherwise we
  //               match by positional `index` within the day.
  //  - `delete` : value is the bare activity id.
  const handleChangePlace = useCallback((event: TripPlaceEvent) => {
    const { activity, date } = event;
    const { type, value, destinationIndx } = activity;
    const destIndx = destinationIndx ?? 0;

    setLocalTripData((prev) => {
      if (!prev) return prev;
      return produce(prev, (draft) => {
        const dest = draft.destinations?.[destIndx];
        if (!dest?.itinerary) return;
        const day = dest.itinerary.find((d) => isSameDay(d.date, date));
        if (!day) return;

        if (type === "add") {
          // Local numeric id — `tripStateToSaveInput` ignores it when shaping
          // the GraphQL payload, and the backend issues real UUIDs on save.
          const maxId = dest.itinerary.reduce(
            (m, d) =>
              Math.max(m, ...(d.activities ?? []).map((a) => Number(a.id) || 0)),
            0,
          );
          const newActivity = { ...(value as Partial<Activity>), id: maxId + 1 } as Activity;
          day.activities = [...(day.activities ?? []), newActivity];
        } else if (type === "edit") {
          const wrapper = value as {
            index?: number;
            value?: Partial<Activity>;
          };
          const patch = wrapper?.value ?? {};
          const target =
            patch.id != null
              ? day.activities?.find((a) => a.id === patch.id)
              : typeof wrapper?.index === "number"
                ? day.activities?.[wrapper.index]
                : undefined;
          if (target) Object.assign(target, patch);
        } else if (type === "delete") {
          day.activities = (day.activities ?? []).filter(
            (a) => a.id !== value,
          );
        }
      });
    });
  }, []);

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

  const persistedStatusName = apiTrip?.status?.name ?? TRIP_STATUS.PLANNING;
  const isLocked = LOCKED_STATUS_NAMES.has(persistedStatusName);

  // BasicTripInfo gates its trip-name pencil + status edit affordances on
  // this flag (organizer-only, planning-only). Activity-card editing is
  // intentionally NOT done on this page — clicking Edit Trip / the pencil
  // routes the user to the dedicated stepper editor.
  const isViewMode = !isOrganizer || isLocked;
  // Save Trip only matters while the trip is still in Planning — that's the
  // one state where activity-level edits can be made. Once Confirmed,
  // activities lock and the only legitimate trip-level change is the
  // "Mark Completed" promotion (which owns its own save below).
  const canSaveTrip =
    isOrganizer && persistedStatusName === TRIP_STATUS.PLANNING;
  const canMarkCompleted =
    isOrganizer && persistedStatusName === TRIP_STATUS.CONFIRMED;
  const canExport = isLocked;

  // Save the trip with the freshly-picked status. Used by both the status
  // modal (Planning → Confirmed / Cancelled) and the Mark Completed button.
  // Builds the save input from current local edits so any pending activity /
  // budget changes go along for the ride.
  const handleStatusChange = useCallback(
    async (next: TripStatus) => {
      if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return;
      setSaveError(null);
      try {
        const input = tripStateToSaveInput(tripData, {
          id: apiTrip.id,
          interaryTypeId: apiTrip.interaryType.id,
          tripStatusId: String(next.id),
        });
        await saveItinerary.mutateAsync(input);
        setStatusOverride(null);
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to update trip status.",
        );
        // Re-throw so the modal's await catches and keeps itself open.
        throw err;
      }
    },
    [apiTrip, tripData, saveItinerary],
  );

  const handleMarkCompleted = useCallback(async () => {
    if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return;
    const completed = tripStatuses.find(
      (s) => s.name === TRIP_STATUS.COMPLETED,
    );
    if (!completed) {
      setSaveError("Couldn't resolve the Completed status. Try again shortly.");
      return;
    }
    setSaveError(null);
    try {
      const input = tripStateToSaveInput(tripData, {
        id: apiTrip.id,
        interaryTypeId: apiTrip.interaryType.id,
        tripStatusId: String(completed.id),
      });
      await saveItinerary.mutateAsync(input);
      setStatusOverride(null);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to mark trip completed.",
      );
    }
  }, [apiTrip, tripData, tripStatuses, saveItinerary]);

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

  // Mirror TripSteps: budget-split participants are friends + organizers,
  // deduped by id. Otherwise the AddBudget modal only lists invited friends
  // and silently drops the organizer (the trip owner / current user).
  const participants = (() => {
    const friends = tripData.friends ?? [];
    const organizer = tripData.organizer ?? [];
    const seen = new Set<number>();
    const merged: typeof friends = [];
    for (const entry of [...friends, ...organizer]) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      merged.push(entry);
    }
    return merged;
  })();
  const destinations = tripData.destinations ?? [];

  return (
    <Layout title="Trip Detail">
      <Grid container>
        <Grid item lg={12} md={12} xs={12}>
          <BasicTripInfo
            isViewMode={isViewMode}
            // /trip-detail uses the dedicated Edit Trip button as the
            // single entry point to the editor; the small trip-name
            // pencil would be a redundant duplicate, so hide it.
            // Status-badge pencil stays — that's gated by isViewMode.
            hideEditPencil
            data={tripData}
            onChangeStep={handleChangeStep}
            onStatusChange={handleStatusChange}
            onExportExcel={canExport ? handleExportExcel : undefined}
            // Edit Trip routes to the dedicated stepper editor — that's
            // where all the activity-card edit affordances live.
            onEnterEditMode={canSaveTrip ? handleChangeStep : undefined}
            onMarkCompleted={canMarkCompleted ? handleMarkCompleted : undefined}
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
          {/* Activity cards on /trip-detail are read-only by design — the
              Edit Trip button (and the trip-name pencil) navigate to the
              stepper editor where the inline edit affordances live.
              Forcing isViewMode=true regardless of organizer/lock state
              keeps the trip-detail page calm. */}
          <DestinationDetail
            type={tripData.type}
            isViewMode={true}
            startDate={tripData.startDate}
            participants={participants}
            endDate={tripData.endDate}
            destinations={destinations}
            onChangePlace={handleChangePlace}
            onChangeBudget={handleChangeBudget}
          />
        </Grid>
      </Grid>
    </Layout>
  );
};

export default TripDetail;
