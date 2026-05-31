import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { produce } from "immer";
import confetti from "canvas-confetti";
import "./index.scss";
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
} from "@mui/material";
import Menu, { MenuActionItem } from "components/common/Menu";
import IosShareIcon from "@mui/icons-material/IosShare";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import EditCalendarRoundedIcon from "@mui/icons-material/EditCalendarRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import classnames from "classnames";
import Layout from "components/common/Layout/SubLayout";
import BudgetSummary from "components/BudgetSummary";
import BasicTripInfo from "components/BasicTripInfo";
import DestinationDetail from "components/DestinationDetail";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import ModalButton, {
  type ModalButtonHandle,
} from "components/ModalButton";
import NotifyParticipantsCheckbox from "components/NotifyParticipantsCheckbox";
import TripStatusBadge from "components/TripStatusBadge";
import TripSuggestionsCard from "components/TripSuggestionsCard";
import TripCheckupCard from "components/TripCheckupCard";
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
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import TripDetailTour, {
  TRIP_DETAIL_TOUR_STORAGE_KEY,
} from "components/TripDetailTour";
import { useActivityStartReminders } from "hooks/useActivityStartReminders";
import { useTripDayReminders } from "hooks/useTripDayReminders";
import { TRIP_BASIC, TRIP_STATUS } from "constants";
import { exportTripToExcel } from "utils/exportTripExcel";
import { exportTripToPdf, printTripPdf } from "utils/exportTripPdf";
import type {
  Activity,
  ActivityStatus,
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

/** Three-burst confetti — left, center, right — for the
 *  Planning → Confirmed transition. Uses brand colors. Falls
 *  back silently if the user is in a reduced-motion context. */
const fireConfettiBurst = () => {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#3cb54b", "#5fd55f", "#F79F26", "#FFD166"];
  const defaults = {
    spread: 70,
    ticks: 90,
    gravity: 1.1,
    decay: 0.94,
    startVelocity: 35,
    colors,
  };
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.2, y: 0.4 } });
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.3 } });
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.8, y: 0.4 } });
};

export const TripDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useTripDispatch();
  const { user: currentUser, isAdmin } = useUser();
  const idParam = searchParams.get("id");

  const { data: apiItineraries = [], isLoading } = useMyItineraries();

  // Trip-detail onboarding tour. Auto-runs the first time a logged-in
  // user lands here; re-runnable any time from the "Take the tour"
  // pill in the header. Storage flag is set on close so the auto-
  // trigger only fires once.
  const [detailTourRun, setDetailTourRun] = useState(false);
  // Basic-info card (dates / destination / budget / who's going) is
  // hidden by default on this page to keep the itinerary clean, but
  // surfaced behind a "Trip details" toggle for a quick overview.
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  // Inline activity-editing mode. Clicking "Edit activities" flips the
  // day list from read-only to editable IN PLACE (no navigation) and
  // swaps the pill for Save / Cancel. Only the activities are editable;
  // basic info is untouched (edit that from the "Trip details" card).
  const [isEditingActivities, setIsEditingActivities] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    if (!idParam) return;
    if (typeof window === "undefined") return;
    if (
      window.localStorage.getItem(TRIP_DETAIL_TOUR_STORAGE_KEY) === "1"
    ) return;
    // Wait for the trip to actually render — Joyride needs tooltip
    // targets in the DOM before it can position anything.
    const handle = window.setTimeout(() => setDetailTourRun(true), 500);
    return () => window.clearTimeout(handle);
  }, [currentUser, idParam]);

  const handleDetailTourClose = () => {
    setDetailTourRun(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TRIP_DETAIL_TOUR_STORAGE_KEY, "1");
    }
  };

  const handleDetailTourStart = () => setDetailTourRun(true);

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

  // Drop out of inline activity-edit mode when switching to another trip.
  useEffect(() => {
    setIsEditingActivities(false);
  }, [idParam]);

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
  // Name → UUID lookup passed to `tripStateToSaveInput` so per-activity
  // status toggles that captured `{ id: 0, name: 'Confirmed' }` (cold
  // cache) still serialize the real UUID. Without this, the toggle
  // appears to take effect locally but the post-save refetch reverts
  // the activity to Planning.
  const activityStatusLookup = useMemo(
    () => new Map(tripStatuses.map((s) => [s.name, s.id])),
    [tripStatuses],
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  // Per-save opt-out for the participant notification fan-out. Defaults
  // ON; one checkbox in the header controls every save / status change /
  // mark-completed / delete on this page.
  const [notifyParticipants, setNotifyParticipants] = useState(true);

  // Dirty when the user has changed budgets/places (localTripData diverges
  // from the server-derived baseTripData) or picked a new status badge.
  const isDirty =
    (!!baseTripData && localTripData !== baseTripData) || statusOverride !== null;

  // Hoisted early so callbacks below can reference it in their deps
  // arrays without tripping a TDZ error.
  const persistedStatusName = apiTrip?.status?.name ?? TRIP_STATUS.PLANNING;

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
  // Detect an "activity marked Completed" edit. Used to fire an auto-save
  // when the trip is already Confirmed — the Complete tick on the card
  // should be a one-tap action, not "mark then click Save Trip".
  const isMarkActivityCompletedEvent = (event: TripPlaceEvent): boolean => {
    const { activity } = event;
    if (activity.type !== "edit") return false;
    const wrapper = activity.value as
      | { value?: Partial<Activity> }
      | undefined;
    const status = wrapper?.value?.status as ActivityStatus | undefined;
    return (
      !!status &&
      typeof status === "object" &&
      status.name === TRIP_STATUS.COMPLETED
    );
  };
  // Sibling to the Completed-tap auto-save: detects the Planning↔Confirmed
  // quick-toggle fired from the status pill on /trip-detail. Same shape as
  // the Completed event (patch carries a status object), just a different
  // name. We auto-save these too so the user doesn't have to first enter
  // the stepper editor just to lock in a place.
  const isPlanningStatusToggleEvent = (event: TripPlaceEvent): boolean => {
    const { activity } = event;
    if (activity.type !== "edit") return false;
    const wrapper = activity.value as
      | { value?: Partial<Activity> }
      | undefined;
    const status = wrapper?.value?.status as ActivityStatus | undefined;
    return (
      !!status &&
      typeof status === "object" &&
      (status.name === TRIP_STATUS.PLANNING ||
        status.name === TRIP_STATUS.CONFIRMED)
    );
  };
  // Detect paid-attestation edits (Mark as paid, edit who paid, clear
  // paid). The patch contains paidAt and/or paidBy — paidAt may be
  // null when clearing, so check for explicit `undefined` to
  // distinguish "field present" from "field absent".
  const isPaidEditEvent = (event: TripPlaceEvent): boolean => {
    const { activity } = event;
    if (activity.type !== "edit") return false;
    const wrapper = activity.value as
      | { value?: Partial<Activity> }
      | undefined;
    const patch = wrapper?.value;
    if (!patch) return false;
    return patch.paidAt !== undefined || patch.paidBy !== undefined;
  };

  const handleChangePlace = useCallback(
    (event: TripPlaceEvent) => {
      const { activity, date } = event;
      const { type, value, destinationIndx } = activity;
      const destIndx = destinationIndx ?? 0;

      if (!localTripData) return;
      const next = produce(localTripData, (draft) => {
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
      setLocalTripData(next);

      // One-shot persist when the user taps the Complete tick on an
      // activity while the trip is already Confirmed. No separate Save
      // Trip click needed — the activity transitions to Completed and
      // is saved to the backend in a single tap.
      //
      // GUARD: only fire when the tripStatuses lookup has at least one
      // entry. Otherwise `tripStateToSaveInput` resolves every activity's
      // status UUID to null (the cold-cache `{ id: 0, name: … }`
      // fallback can't be resolved by name when the lookup itself is
      // empty). The post-save refetch then returns activities with
      // status=Planning and the UI flicks back — the "checkmark flicks
      // but doesn't update" bug. The activity card disables the tick
      // when its own copy of `completedStatus.id` is 0, but the lookup
      // races with the trip fetch, so belt-and-suspenders this here.
      const shouldAutoSaveStatusEdit =
        apiTrip &&
        apiTrip.interaryType?.id &&
        activityStatusLookup.size > 0 &&
        ((persistedStatusName === TRIP_STATUS.CONFIRMED &&
          isMarkActivityCompletedEvent(event)) ||
          (persistedStatusName === TRIP_STATUS.PLANNING &&
            isPlanningStatusToggleEvent(event)));
      // Paid-edit auto-save runs at every lifecycle stage except
      // Cancelled — payment settlement is operational and should
      // persist even on Confirmed / Completed trips. The
      // `activityStatusLookup` guard from the status-edit branch
      // doesn't belong here: paid edits don't change any activity's
      // status, so an empty lookup wouldn't corrupt the saved
      // payload. Without this fix, a paid edit on a Confirmed trip
      // silently dropped the save whenever the lookup hadn't loaded
      // yet (or had been invalidated by an earlier refetch), and
      // the next baseTripData refetch wiped the user's change.
      const shouldAutoSavePaidEdit =
        apiTrip &&
        apiTrip.interaryType?.id &&
        persistedStatusName !== TRIP_STATUS.CANCELLED &&
        isPaidEditEvent(event);
      if (shouldAutoSaveStatusEdit || shouldAutoSavePaidEdit) {
        // Skip when a save is already in flight. The backend's
        // save_itinerary uses soft-delete-then-reinsert semantics —
        // two concurrent saves on the same trip will each soft-delete
        // the existing rows (the second is a no-op since they're
        // already gone) and then each insert a fresh copy, leaving
        // two sets of "active" activity rows with different ids but
        // identical content. That's exactly the duplicate we saw on
        // /trip-detail and in the exported PDF. Until the backend
        // serializes per-itinerary writes (SELECT ... FOR UPDATE on
        // the itinerary row), guard the client side. The change is
        // already applied to localTripData above so the UI reflects
        // it; the next status/paid edit picks up the latest state
        // and persists it in one save.
        if (saveItinerary.isPending) {
          setSaveError(
            "Still saving the previous change. Try again in a moment.",
          );
          return;
        }
        const input = tripStateToSaveInput(next, {
          id: apiTrip.id,
          interaryTypeId: apiTrip.interaryType.id,
          tripStatusId: apiTrip.status?.id ?? null,
          notifyParticipants,
          activityStatusLookup,
        });
        void saveItinerary.mutateAsync(input).catch((err: unknown) => {
          setSaveError(
            err instanceof Error
              ? err.message
              : shouldAutoSavePaidEdit
                ? "Failed to update the payment."
                : "Failed to update the activity status.",
          );
        });
      }
    },
    [
      localTripData,
      apiTrip,
      persistedStatusName,
      saveItinerary,
      notifyParticipants,
      activityStatusLookup,
    ],
  );

  const handleSaveTrip = useCallback(async (): Promise<boolean> => {
    if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return false;
    setSaveError(null);
    try {
      const input = tripStateToSaveInput(tripData, {
        id: apiTrip.id,
        interaryTypeId: apiTrip.interaryType.id,
        tripStatusId: statusOverride?.id
          ? String(statusOverride.id)
          : apiTrip.status?.id ?? null,
        notifyParticipants,
        activityStatusLookup,
      });
      await saveItinerary.mutateAsync(input);
      // Cache invalidation triggers a refetch; baseTripData updates and the
      // useEffect resyncs localTripData. Clear the status override so the
      // re-rendered badge reflects the freshly-saved status.
      setStatusOverride(null);
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save the trip.",
      );
      return false;
    }
  }, [apiTrip, tripData, statusOverride, saveItinerary, notifyParticipants]);

  // ── Inline activity-edit controls ──────────────────────────────────
  const handleEditActivities = () => setIsEditingActivities(true);

  const handleSaveActivities = useCallback(async () => {
    const ok = await handleSaveTrip();
    if (ok) setIsEditingActivities(false);
  }, [handleSaveTrip]);

  const handleCancelActivities = useCallback(() => {
    // Discard any in-place activity edits and drop back to read-only.
    setLocalTripData(baseTripData);
    setStatusOverride(null);
    setSaveError(null);
    setIsEditingActivities(false);
  }, [baseTripData]);

  const handleDeleteTrip = useCallback(async () => {
    if (!apiTrip) return;
    setSaveError(null);
    try {
      await deleteItinerary.mutateAsync({
        id: apiTrip.id,
        notifyParticipants,
      });
      // Trip is gone — drop the user back at the trips list.
      navigate("/trips");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete the trip.",
      );
    }
  }, [apiTrip, deleteItinerary, navigate, notifyParticipants]);

  const isOrganizer = useMemo(
    () => isCurrentUserOrganizer(apiTrip, currentUser?.id),
    [apiTrip, currentUser?.id],
  );

  const isLocked = LOCKED_STATUS_NAMES.has(persistedStatusName);

  // BasicTripInfo gates its trip-name pencil + status edit affordances on
  // this flag (organizer-only, planning-only). Activity-card editing is
  // intentionally NOT done on this page — clicking Edit Trip / the pencil
  // routes the user to the dedicated stepper editor.
  const isViewMode = !isOrganizer || isLocked;
  // Save Trip only matters while the trip is still in Planning — that's the
  // one state where activity-level edits can be made. Once Confirmed,
  // activities lock and the only legitimate trip-level change is the
  // "Mark complete" promotion (handled by TripStatusBadge).
  const canSaveTrip =
    isOrganizer && persistedStatusName === TRIP_STATUS.PLANNING;
  // TripStatusBadge shows "Confirm trip" in Planning and "Mark complete" in
  // Confirmed — those are the only states with a forward move.
  const canPromoteStatus =
    isOrganizer &&
    (persistedStatusName === TRIP_STATUS.PLANNING ||
      persistedStatusName === TRIP_STATUS.CONFIRMED);
  const canCancelTrip =
    isOrganizer &&
    (persistedStatusName === TRIP_STATUS.PLANNING ||
      persistedStatusName === TRIP_STATUS.CONFIRMED);
  // Share + download are always allowed once a trip exists, regardless
  // of its lifecycle state. Sharing in Planning lets organizers send
  // the draft to participants for feedback; sharing in Confirmed /
  // Completed lets anyone retrieve the final copy. Previously gated to
  // `isLocked` (Confirmed/Completed/Cancelled), which silently hid the
  // share button while drafting.
  const canExport = true;

  // Save the trip with the freshly-picked status. Used by both the status
  // modal (Planning → Confirmed / Cancelled) and the Mark Completed button.
  // Builds the save input from current local edits so any pending activity /
  // budget changes go along for the ride.
  const handleStatusChange = useCallback(
    async (next: TripStatus) => {
      if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return;
      setSaveError(null);
      const previousStatus = persistedStatusName;
      try {
        const input = tripStateToSaveInput(tripData, {
          id: apiTrip.id,
          interaryTypeId: apiTrip.interaryType.id,
          tripStatusId: String(next.id),
          notifyParticipants,
          activityStatusLookup,
        });
        await saveItinerary.mutateAsync(input);
        setStatusOverride(null);
        // Celebration on Planning → Confirmed. A short confetti burst
        // plus a sticky-ish toast — the trip just graduated from "an
        // idea" to "happening." Fires only on the actual transition so
        // toggling back-and-forth doesn't re-trigger.
        if (
          previousStatus === TRIP_STATUS.PLANNING &&
          next.name === TRIP_STATUS.CONFIRMED
        ) {
          fireConfettiBurst();
          setReminderToast(
            "Yay! Your trip is confirmed and ready to go!"
          );
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to update trip status.",
        );
        // Re-throw so the modal's await catches and keeps itself open.
        throw err;
      }
    },
    [apiTrip, tripData, saveItinerary, notifyParticipants, persistedStatusName],
  );

  const handleCancelTrip = useCallback(async () => {
    if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return;
    const cancelled = tripStatuses.find(
      (s) => s.name === TRIP_STATUS.CANCELLED,
    );
    if (!cancelled) {
      setSaveError("Couldn't resolve the Cancelled status. Try again shortly.");
      return;
    }
    setSaveError(null);
    try {
      const input = tripStateToSaveInput(tripData, {
        id: apiTrip.id,
        interaryTypeId: apiTrip.interaryType.id,
        tripStatusId: String(cancelled.id),
        notifyParticipants,
        activityStatusLookup,
      });
      await saveItinerary.mutateAsync(input);
      setStatusOverride(null);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to cancel the trip.",
      );
    }
  }, [apiTrip, tripData, tripStatuses, saveItinerary, notifyParticipants]);

  // Navigate into the full stepper editor for this existing trip — used
  // by the "Trip details" edit affordance and the status-badge "edit
  // dates". (Activities are edited inline on this page, not here.)
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

  const handleExportPdf = () => {
    if (!tripData) return;
    void exportTripToPdf(tripData);
  };

  // ---- Activity-start reminder hooks --------------------------------
  // MUST be declared BEFORE the early returns below (the loading /
  // not-found branches) — React's rules-of-hooks treats every render
  // path as needing the same hook order, so a conditional bail-out
  // before these would crash with "Rendered more hooks than during
  // the previous render." Body handles the null tripData case
  // gracefully via the `?? []` fallback.
  const remindableActivities = useMemo(() => {
    const out: { activity: Activity; dayDate: string }[] = [];
    const destsForReminders = tripData?.destinations ?? [];
    for (const dest of destsForReminders) {
      for (const day of dest.itinerary ?? []) {
        if (!day.date) continue;
        for (const activity of day.activities ?? []) {
          out.push({ activity, dayDate: day.date });
        }
      }
    }
    return out;
  }, [tripData]);

  const [reminderToast, setReminderToast] = useState<string | null>(null);
  useActivityStartReminders(remindableActivities, {
    leadMinutes: 15,
    onReminder: (activity, minutesUntil) => {
      const label = activity.name?.trim() || 'Your next activity';
      setReminderToast(
        minutesUntil === 1
          ? `${label} starts in 1 minute`
          : `${label} starts in ${minutesUntil} minutes`
      );
    },
  });

  // Trip-level reminders: a one-time "your trip starts today" toast on
  // the start day, plus a per-day morning summary (defaults to 8am
  // local). Both reuse the activity-reminder snackbar slot so the UI
  // doesn't gain a second floating banner. Persisted-fired state lives
  // in localStorage keyed by trip id so a refresh doesn't re-fire.
  useTripDayReminders(tripData, {
    onTripStart: ({ name }) => {
      setReminderToast(`${name} starts today — have a great trip!`);
    },
    onDayStart: (_trip, _dayDate, { activityCount, dayIndex, totalDays }) => {
      const count =
        activityCount === 0
          ? 'a free day — nothing scheduled.'
          : activityCount === 1
            ? '1 activity planned.'
            : `${activityCount} activities planned.`;
      setReminderToast(`Day ${dayIndex} of ${totalDays} — ${count}`);
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="trip-detail-empty">
          <p>Loading trip…</p>
        </div>
      </Layout>
    );
  }

  if (!apiTrip || !tripData) {
    return (
      <Layout>
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
    <Layout>
      <div
        className={`trip-detail-themed trip-detail-status-${persistedStatusName.toLowerCase()}`}
      >
      <Snackbar
        open={!!saveError}
        autoHideDuration={6000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 1500 }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setSaveError(null)}
          sx={{ maxWidth: 640, width: '100%' }}
        >
          {saveError}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!reminderToast}
        autoHideDuration={8000}
        onClose={() => setReminderToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 1500 }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setReminderToast(null)}
          sx={{ maxWidth: 640, width: '100%' }}
        >
          {reminderToast}
        </Alert>
      </Snackbar>
      <Grid container>
        {/* Standalone trip header — title + action buttons. Lives
            OUTSIDE BasicTripInfo so Hide detail can unmount the basic-
            info + budget cards without taking the title/buttons with
            them. */}
        <Grid item lg={12} md={12} xs={12}>
          <TripDetailHeader
            tripData={tripData}
            statusName={persistedStatusName}
            canExport={canExport}
            canPromoteStatus={canPromoteStatus}
            canCancelTrip={canCancelTrip}
            isOrganizer={isOrganizer}
            isSaving={saveItinerary.isPending}
            isDeleting={deleteItinerary.isPending}
            onEditTrip={handleChangeStep}
            onStartTour={handleDetailTourStart}
            basicInfoOpen={showBasicInfo}
            onToggleBasicInfo={() => setShowBasicInfo((v) => !v)}
            canEditActivities={canSaveTrip}
            isEditingActivities={isEditingActivities}
            onEditActivities={handleEditActivities}
            onSaveActivities={handleSaveActivities}
            onCancelActivities={handleCancelActivities}
            onPrint={() => {
              if (!tripData) return;
              void printTripPdf(tripData);
            }}
            onDownloadExcel={handleExportExcel}
            onDownloadPdf={handleExportPdf}
            onStatusChange={handleStatusChange}
            onCancelTrip={handleCancelTrip}
            onDeleteTrip={handleDeleteTrip}
            showNotifyToggle={
              isOrganizer &&
              (apiTrip.friends.length + apiTrip.organizers.length) > 1
            }
            notifyParticipants={notifyParticipants}
            onChangeNotifyParticipants={setNotifyParticipants}
          />
        </Grid>
        {/* Collapsible "Trip details" overview — the basic-info card
            (organizer / where / when / budget / who's going). The toggle
            that opens it lives up in the header action row; this just
            renders the expanded card. */}
        {showBasicInfo && (
          <Grid item lg={12} md={12} xs={12} className="trip-detail-basic-info-row">
            <div className="trip-detail-basic-info-card">
              <BasicTripInfo
                data={tripData}
                onChangeStep={handleChangeStep}
                hideHeader
                // Edit sits ABOVE the stats (top of the card body), not
                // overlapping the Organizer tile. Organizer + Planning gated.
                onEditBasicInfo={canSaveTrip ? handleChangeStep : undefined}
              />
            </div>
          </Grid>
        )}
        {/* Trip expenses meter is part of the "Trip details" overview —
            shown/hidden together with the basic-info card via the same
            header toggle. */}
        {showBasicInfo && (
          <Grid item lg={12} md={12} xs={12}>
            <BudgetSummary data={tripData} />
          </Grid>
        )}
        {persistedStatusName === TRIP_STATUS.COMPLETED && (
          <Grid item lg={12} md={12} xs={12}>
            <div className="trip-detail-completed-banner">
              <EmojiEventsRoundedIcon
                className="trip-detail-completed-icon"
                fontSize="medium"
              />
              <div className="trip-detail-completed-text">
                <span className="trip-detail-completed-title">
                  Trip completed
                </span>
                <span className="trip-detail-completed-sub">
                  Locked in as a record of where you&rsquo;ve been. Activity
                  edits, deletes, and budget changes are sealed.
                </span>
              </div>
            </div>
          </Grid>
        )}
        {persistedStatusName === TRIP_STATUS.PLANNING && (
          <Grid item lg={12} md={12} xs={12}>
            <div className="trip-detail-planning-banner">
              <EditCalendarRoundedIcon
                className="trip-detail-planning-icon"
                fontSize="medium"
              />
              <div className="trip-detail-planning-text">
                <span className="trip-detail-planning-title">
                  Trip in planning
                </span>
                <span className="trip-detail-planning-sub">
                  {isOrganizer
                    ? "Tap any Planning chip on an activity to lock it in, or hit Edit Trip for full edits."
                    : "The organizer is still arranging activities. Check back soon."}
                </span>
              </div>
            </div>
          </Grid>
        )}
        {apiTrip && (
          <Grid item lg={12} md={12} xs={12}>
            <TripCheckupCard
              tripId={apiTrip.id}
              isPro={Boolean(currentUser?.isPaidMember || isAdmin)}
              isPlanning={persistedStatusName === TRIP_STATUS.PLANNING}
            />
            <TripSuggestionsCard
              tripId={apiTrip.id}
              isPro={Boolean(currentUser?.isPaidMember || isAdmin)}
              isPlanning={persistedStatusName === TRIP_STATUS.PLANNING}
              isOrganizer={isOrganizer}
              destinations={destinations}
              onAddPlace={handleChangePlace}
            />
          </Grid>
        )}
        <Grid item lg={12}>
          {/* Activity cards on /trip-detail are read-only by design — the
              Edit basic info button (and the trip-name pencil) navigate to
              the stepper editor where the inline edit affordances live. The
              one exception is the per-activity status pill: organizers
              can flip Planning↔Confirmed in-place while the trip itself
              is still Planning, and handleChangePlace auto-saves that
              change so it doesn't sit in local-only state. */}
          <DestinationDetail
            type={tripData.type}
            // Read-only by default; "Edit activities" flips this so the
            // day list gains add / edit / delete / reorder affordances.
            // Guarded by canSaveTrip so a mid-edit lifecycle change can't
            // leave the list editable on a locked trip.
            isViewMode={!(isEditingActivities && canSaveTrip)}
            allowStatusToggle={
              isOrganizer && persistedStatusName === TRIP_STATUS.PLANNING
            }
            // Payment settlement stays editable for the organizer at
            // every lifecycle stage except Cancelled — even after the
            // trip is Confirmed or Completed, marking who actually
            // paid is operational and shouldn't require dropping into
            // the stepper editor.
            allowPaidEdits={
              isOrganizer && persistedStatusName !== TRIP_STATUS.CANCELLED
            }
            startDate={tripData.startDate}
            participants={participants}
            endDate={tripData.endDate}
            destinations={destinations}
            onChangePlace={handleChangePlace}
            onChangeBudget={handleChangeBudget}
            tripStatusName={persistedStatusName}
            // The status pill auto-saves on click. While that save
            // is in flight, propagate the pending flag downward so
            // Activities can disable the pill — prevents a second
            // click from firing the "Still saving" guard toast.
            isAutoSaving={saveItinerary.isPending}
          />
        </Grid>
        {/* End-of-trip cap — visual full-stop after the day list, regardless
            of status. Mirrors the date-block dot so the timeline reads as
            "starts here … ends here." */}
        <Grid item lg={12} md={12} xs={12}>
          <div
            className={`trip-detail-end status-${persistedStatusName.toLowerCase()}`}
          >
            <span className="trip-detail-end-dot">
              <FlagRoundedIcon fontSize="small" />
            </span>
            <span className="trip-detail-end-label">End of trip</span>
          </div>
        </Grid>
      </Grid>
      <TripDetailTour
        run={detailTourRun}
        onClose={handleDetailTourClose}
      />
      </div>
    </Layout>
  );
};

interface TripDetailHeaderProps {
  tripData: TripState;
  statusName: string;
  canExport: boolean;
  canPromoteStatus: boolean;
  canCancelTrip: boolean;
  isOrganizer: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onEditTrip: () => void;
  onStartTour: () => void;
  basicInfoOpen: boolean;
  onToggleBasicInfo: () => void;
  /** Inline activity-edit control (lives in the header action row). */
  canEditActivities: boolean;
  isEditingActivities: boolean;
  onEditActivities: () => void;
  onSaveActivities: () => void;
  onCancelActivities: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  onStatusChange: (next: TripStatus) => void | Promise<void>;
  onCancelTrip: () => void | Promise<void>;
  onDeleteTrip: () => void | Promise<void>;
  /** Only true for organizers on trips with other participants. Solo
   *  trips don't render the toggle at all — there's nobody to notify. */
  showNotifyToggle: boolean;
  notifyParticipants: boolean;
  onChangeNotifyParticipants: (next: boolean) => void;
}

const TripDetailHeader = ({
  tripData,
  statusName,
  canExport,
  canPromoteStatus,
  canCancelTrip,
  isOrganizer,
  isSaving,
  isDeleting,
  onEditTrip,
  onStartTour,
  basicInfoOpen,
  onToggleBasicInfo,
  canEditActivities,
  isEditingActivities,
  onEditActivities,
  onSaveActivities,
  onCancelActivities,
  onPrint,
  onDownloadExcel,
  onDownloadPdf,
  onStatusChange,
  onCancelTrip,
  onDeleteTrip,
  showNotifyToggle,
  notifyParticipants,
  onChangeNotifyParticipants,
}: TripDetailHeaderProps) => {
  const exportModalRef = useRef<ModalButtonHandle>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    null | "cancel" | "delete"
  >(null);

  const handlePrint = () => {
    exportModalRef.current?.closeModal();
    onPrint();
  };
  const handleDownloadExcel = () => {
    exportModalRef.current?.closeModal();
    onDownloadExcel();
  };
  const handleDownloadPdf = () => {
    exportModalRef.current?.closeModal();
    onDownloadPdf();
  };

  // Share-text helpers — assemble a short itinerary summary and a
  // crawl-friendly preview URL. The preview URL routes through the
  // backend `/share/preview` endpoint which returns OG / Twitter Card
  // tags so WhatsApp / Facebook can unfurl a rich card. The raw
  // `/trip-detail?id=...` URL is private (auth-gated) — sending it
  // straight to a crawler returns 404 / login wall and the chat shows
  // "not found" instead of a preview.
  const buildCanonicalUrl = () => {
    if (typeof window === "undefined") return "";
    if (tripData.apiId) {
      return `${window.location.origin}/trip-detail?id=${tripData.apiId}`;
    }
    return window.location.href;
  };

  /** Plain-text body for share channels (WhatsApp / email / copy). */
  const buildShareBody = () => {
    const lines: string[] = [];
    const tripTitle = tripData.name?.trim() || "My trip";
    lines.push(`📍 ${tripTitle}`);
    if (tripData.startDate && tripData.endDate) {
      lines.push(`🗓 ${tripData.startDate} → ${tripData.endDate}`);
    }
    const countries = (tripData.destinations ?? [])
      .map((d) => d.country?.name)
      .filter((n): n is string => Boolean(n));
    if (countries.length) {
      lines.push(`✈️ ${countries.join(" · ")}`);
    }
    const url = buildCanonicalUrl();
    if (url) lines.push(url);
    return lines.join("\n");
  };

  const handleShareWhatsApp = () => {
    exportModalRef.current?.closeModal();
    // Use the canonical /trip-detail?id= URL — short, readable, on
    // datryp.com. The /share/preview routing we briefly tried put a
    // long unreadable URL on the AWS ECS hostname into the WhatsApp
    // message body (URL is rendered as literal text in the chat
    // bubble). The trip body text already contains the title, dates,
    // and countries so a recipient understands the share even if
    // WhatsApp can't unfurl the auth-gated trip URL.
    const text = encodeURIComponent(buildShareBody());
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleShareEmail = () => {
    exportModalRef.current?.closeModal();
    const tripTitle = tripData.name?.trim() || "My trip";
    const subject = encodeURIComponent(`Trip: ${tripTitle}`);
    const body = encodeURIComponent(buildShareBody());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const [copyToast, setCopyToast] = useState(false);
  const handleCopyLink = async () => {
    exportModalRef.current?.closeModal();
    const url = buildCanonicalUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopyToast(true);
    } catch {
      // Silent — clipboard API can fail under HTTP / sandboxed iframes.
    }
  };

  const closeMenu = () => setMenuAnchor(null);
  const openConfirm = (kind: "cancel" | "delete") => {
    closeMenu();
    setConfirmDialog(kind);
  };
  const closeConfirm = () => setConfirmDialog(null);

  const handleConfirm = async () => {
    if (confirmDialog === "cancel") {
      await onCancelTrip();
    } else if (confirmDialog === "delete") {
      await onDeleteTrip();
    }
    closeConfirm();
  };

  const tripName = tripData.name;

  // When the trip is still in Planning, surface "Confirm trip" as the
  // promote button right next to the notification bell in the title
  // row — that's where the static "Planning" pill used to sit. The
  // pill itself is redundant in this state because the promote button
  // already communicates the lifecycle stage AND offers the action.
  // For Confirmed / Completed / Cancelled we keep the read-only pill
  // so users can see at a glance where the trip is.
  const showInlinePromote = canPromoteStatus && statusName === TRIP_STATUS.PLANNING;
  // Read-only status pill ONLY when there's no actionable promote
  // sitting in the same slot. Planning + canPromote → inline Confirm
  // button. Confirmed + canPromote → inline Mark Complete button.
  // Otherwise (Completed / Cancelled / no-promote viewers) → pill.
  const showInlineConfirmedPromote =
    statusName === TRIP_STATUS.CONFIRMED && canPromoteStatus;
  const showInlineStatusPill =
    statusName !== TRIP_STATUS.PLANNING && !showInlineConfirmedPromote;

  return (
    <div className="trip-detail-header">
      <div className="trip-detail-header-title">
        <h2 className="trip-detail-name">{tripName || "Untitled trip"}</h2>
        {/* Planning state: replace the static "Planning" pill with the
            actionable Confirm Trip control. Reads as "your trip is in
            this state AND here's how to advance it" in one element. */}
        {showInlinePromote && (
          <TripStatusBadge
            data={tripData}
            onStatusChange={onStatusChange}
            isSaving={isSaving}
            onEditTripDates={onEditTrip}
          />
        )}
        {/* Confirmed + canPromote: inline Mark Complete button
            replaces the static "Confirmed" pill on BOTH mobile and
            desktop. The button reads as "trip status + how to
            advance" in one element so users aren't hunting in the
            actions row for the promote action. */}
        {showInlineConfirmedPromote && (
          <TripStatusBadge
            data={tripData}
            onStatusChange={onStatusChange}
            isSaving={isSaving}
            onEditTripDates={onEditTrip}
          />
        )}
        {/* Post-Planning lifecycle: read-only status indicator so the
            user always knows where the trip stands. */}
        {showInlineStatusPill && (
          <span
            className={`trip-detail-status trip-detail-status-${statusName.toLowerCase()}`}
            aria-label={`Trip status: ${statusName}`}
          >
            {statusName === TRIP_STATUS.CONFIRMED && (
              <CheckCircleOutlineRoundedIcon className="trip-detail-status-icon" />
            )}
            {statusName === TRIP_STATUS.COMPLETED && (
              <CheckCircleRoundedIcon className="trip-detail-status-icon" />
            )}
            {statusName}
          </span>
        )}
      </div>
      <div className="trip-detail-header-actions">
        {/* Action row: "Trip details" toggle (far left) + the activity
            Edit / Save-Cancel control + notification bell + the three-dot
            kebab (which now carries "Take the tour"). */}
        <button
          type="button"
          className="trip-detail-basic-info-toggle"
          onClick={onToggleBasicInfo}
          aria-expanded={basicInfoOpen}
        >
          <InfoOutlinedIcon fontSize="small" />
          <span>Trip details</span>
          <ExpandMoreRoundedIcon
            className={classnames("chevron", { open: basicInfoOpen })}
          />
        </button>
        {/* Inline activity-edit control — sits next to the bell. Read-only
            → "Edit"; editing → Save + Cancel. */}
        {canEditActivities &&
          (isEditingActivities ? (
            <span className="trip-detail-edit-actions">
              <button
                type="button"
                className="trip-detail-edit-save-btn"
                onClick={onSaveActivities}
                disabled={isSaving}
                aria-label="Save activities"
              >
                <SaveRoundedIcon fontSize="small" />
                <span>{isSaving ? "Saving…" : "Save"}</span>
              </button>
              <button
                type="button"
                className="trip-detail-edit-cancel-btn"
                onClick={onCancelActivities}
                disabled={isSaving}
                aria-label="Cancel editing"
              >
                <CloseRoundedIcon fontSize="small" />
                <span>Cancel</span>
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="trip-detail-edit-activities-btn"
              onClick={onEditActivities}
              aria-label="Edit activities"
            >
              <EditRoundedIcon fontSize="small" />
              <span>Edit</span>
            </button>
          ))}
        {showNotifyToggle && (
          <NotifyParticipantsCheckbox
            checked={notifyParticipants}
            onChange={onChangeNotifyParticipants}
            disabled={isSaving || isDeleting}
          />
        )}
        {canExport && (
          <ModalButton
            ref={exportModalRef}
            title="Share or download trip"
            buttonProps={{
              type: "standard",
              className: "trip-detail-download-btn",
              Icon: IosShareIcon,
              iconProps: { fontSize: "small" },
              title: "Share",
              ariaLabel: "Share or download trip",
            }}
          >
            <div className="trip-export-options">
              <h4 className="trip-export-section-head">Share with people</h4>
              <button
                type="button"
                className="trip-export-option"
                onClick={handleShareWhatsApp}
              >
                <WhatsAppIcon className="trip-export-option-icon" />
                <span className="trip-export-option-text">
                  <span className="trip-export-option-title">WhatsApp</span>
                  <span className="trip-export-option-hint">
                    Send the trip summary + link to a participant or
                    group chat.
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="trip-export-option"
                onClick={handleShareEmail}
              >
                <EmailRoundedIcon className="trip-export-option-icon" />
                <span className="trip-export-option-text">
                  <span className="trip-export-option-title">Email</span>
                  <span className="trip-export-option-hint">
                    Opens your mail app with the trip summary + link.
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="trip-export-option"
                onClick={handleCopyLink}
              >
                <ContentCopyRoundedIcon className="trip-export-option-icon" />
                <span className="trip-export-option-text">
                  <span className="trip-export-option-title">Copy link</span>
                  <span className="trip-export-option-hint">
                    Paste it anywhere — Messages, Slack, anywhere.
                  </span>
                </span>
              </button>

              <h4 className="trip-export-section-head">Download a copy</h4>
              <button
                type="button"
                className="trip-export-option"
                onClick={handleDownloadPdf}
              >
                <PictureAsPdfOutlinedIcon className="trip-export-option-icon" />
                <span className="trip-export-option-text">
                  <span className="trip-export-option-title">
                    Download PDF
                  </span>
                  <span className="trip-export-option-hint">
                    Branded two-page report — itinerary + expense summary.
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="trip-export-option"
                onClick={handlePrint}
              >
                <PrintOutlinedIcon className="trip-export-option-icon" />
                <span className="trip-export-option-text">
                  <span className="trip-export-option-title">
                    Print
                  </span>
                  <span className="trip-export-option-hint">
                    Opens your browser's print preview — save as PDF or send
                    to a printer.
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="trip-export-option"
                onClick={handleDownloadExcel}
              >
                <TableChartOutlinedIcon className="trip-export-option-icon" />
                <span className="trip-export-option-text">
                  <span className="trip-export-option-title">
                    Download Excel
                  </span>
                  <span className="trip-export-option-hint">
                    Day-by-day .xlsx with activities, times, and budget.
                  </span>
                </span>
              </button>
            </div>
          </ModalButton>
        )}
        <Snackbar
          open={copyToast}
          autoHideDuration={2400}
          onClose={() => setCopyToast(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          message="Trip link copied to clipboard"
        />
        {/* Kebab renders for everyone — it carries "Take the tour" (which
            all viewers can use). Share + the destructive lifecycle actions
            are gated to organizers via the per-item flags below. */}
        <IconButton
          className="trip-detail-menu-btn"
          aria-label="More actions"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          disabled={isSaving || isDeleting}
          size="small"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} onClose={closeMenu}>
          <MenuActionItem
            icon={<HelpOutlineRoundedIcon />}
            label="Take the tour"
            onClick={() => {
              closeMenu();
              onStartTour();
            }}
          />
          {canExport && (
            <MenuActionItem
              icon={<IosShareIcon />}
              label="Share & download"
              onClick={() => {
                closeMenu();
                exportModalRef.current?.openModel();
              }}
            />
          )}
          {isOrganizer && canCancelTrip && (
            <MenuActionItem
              icon={<EventBusyRoundedIcon />}
              label="Cancel trip"
              onClick={() => openConfirm("cancel")}
            />
          )}
          {isOrganizer && (
            <MenuActionItem
              icon={<DeleteOutlineRoundedIcon />}
              label="Delete trip"
              onClick={() => openConfirm("delete")}
              tone="danger"
            />
          )}
        </Menu>
      </div>

      <Dialog
        open={confirmDialog !== null}
        onClose={closeConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog === "cancel"
            ? "Cancel this trip?"
            : "Delete this trip?"}
        </DialogTitle>
        <DialogContent>
          {confirmDialog === "cancel" ? (
            <p>
              The trip moves to Cancelled status. Participants will see it as
              cancelled but the itinerary stays viewable. This can be reversed
              later by an organizer.
            </p>
          ) : (
            <p>
              This permanently removes the trip and all its activities.
              Participants will no longer see it in their list. This cannot
              be undone.
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <ButtonCustom
            type="line"
            capitalizeType="uppercase"
            label="Keep trip"
            onClick={closeConfirm}
            disabled={isSaving || isDeleting}
          />
          <ButtonCustom
            type="standard"
            capitalizeType="uppercase"
            label={
              confirmDialog === "delete"
                ? isDeleting
                  ? "Deleting…"
                  : "Delete"
                : isSaving
                ? "Saving…"
                : "Cancel trip"
            }
            onClick={handleConfirm}
            disabled={isSaving || isDeleting}
          />
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TripDetail;
