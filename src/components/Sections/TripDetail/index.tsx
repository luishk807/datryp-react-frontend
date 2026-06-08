import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { produce } from "immer";
import confetti from "canvas-confetti";
import "./index.scss";
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  useMediaQuery,
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
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import EditCalendarRoundedIcon from "@mui/icons-material/EditCalendarRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import WrongLocationRoundedIcon from "@mui/icons-material/WrongLocationRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import HideImageOutlinedIcon from "@mui/icons-material/HideImageOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DownloadForOfflineOutlinedIcon from "@mui/icons-material/DownloadForOfflineOutlined";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
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
import EditBasicInfoModal from "components/EditBasicInfoModal";
import TripStatusBadge from "components/TripStatusBadge";
import TripSuggestionsCard from "components/TripSuggestionsCard";
import TripCheckupCard from "components/TripCheckupCard";
import { useUser } from "context/UserContext";
import { basicInfo, resetTrip, useTripDispatch } from "context/TripContext";
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
import { duplicateTripState, type DuplicateTripRange } from "utils";
import DuplicateTripModal from "components/DuplicateTripModal";
import TripNote from "components/TripNote";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import TripDetailTour, {
  TRIP_DETAIL_TOUR_STORAGE_KEY,
} from "components/TripDetailTour";
import { useActivityStartReminders } from "hooks/useActivityStartReminders";
import { useTripDayReminders } from "hooks/useTripDayReminders";
import { useOfflineTrip } from "hooks/useOfflineTrip";
import { useIsOffline } from "hooks/useIsOffline";
import TripOfflineButton from "components/TripOfflineButton";
import { OFFLINE_STATUS, TRIP_BASIC, TRIP_STATUS } from "constants";
import { exportTripToExcel, getTripExcelBlob } from "utils/exportTripExcel";
import { exportTripToPdf, getTripPdfBlob, printTripPdf } from "utils/exportTripPdf";
import { useEmailTripExport } from "api/hooks/useEmailTripExport";
import TripNotificationPrefModal from "components/TripNotificationPrefModal";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import type {
  Activity,
  ActivityStatus,
  BudgetEntry,
  Destination,
  OfflineStatus,
  TripDestinationEvent,
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

  const {
    data: apiItineraries = [],
    isLoading,
    isFetching,
    isSuccess: itinerariesLoaded,
  } = useMyItineraries();

  // Offline-first: when the device has no network the live query above is
  // empty, so fall back to a downloaded snapshot of this trip (if any).
  // Also powers the "Download itinerary offline" button + status chip.
  const offline = useOfflineTrip(idParam);
  const isOffline = useIsOffline();

  // Trip-detail onboarding tour. Auto-runs the first time a logged-in
  // user lands here; re-runnable any time from the "Take the tour"
  // pill in the header. Storage flag is set on close so the auto-
  // trigger only fires once.
  const [detailTourRun, setDetailTourRun] = useState(false);
  // Basic-info card (dates / destination / budget / who's going) is
  // hidden by default on this page to keep the itinerary clean, but
  // surfaced behind a "Trip details" toggle for a quick overview.
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  // Focus mode: hide every overview card (expenses meter, trip review,
  // planning / status cards, basic-info) so the page is just the dates +
  // activities. For users who want to read/work the itinerary without the
  // surrounding chrome. Session-only; resets on reload.
  const [focusMode, setFocusMode] = useState(false);
  // Text-only mode: hide every activity's hero image so the itinerary reads
  // as a dense text list. Session-only (resets on reload), independent of
  // focus mode. Applied as a class on the trip wrapper below.
  // Activity hero images default to hidden on mobile (dense, scannable
  // itinerary — they make cards much taller), shown on desktop. Either way
  // the header "show images" toggle flips it. Evaluated once at mount; a
  // view toggle doesn't need to track later resizes.
  const [hideImages, setHideImages] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 720px)").matches,
  );
  // Night view: dark theme for the itinerary (+ its chrome). Session-only
  // and tied to this visit — resets to day mode when the user leaves the
  // itinerary (the component unmounts), like the focus/text toggles above.
  const [nightMode, setNightMode] = useState(false);
  // Toggle a body class so the GLOBAL app chrome (header logo + bottom
  // nav / footer, which live outside this component in Layout / App) can
  // hide too — true full-screen focus on the itinerary. Cleaned up on
  // unmount so leaving the page never leaves the app stuck chromeless.
  useEffect(() => {
    const cls = "trip-focus-mode";
    document.body.classList.toggle(cls, focusMode);
    return () => document.body.classList.remove(cls);
  }, [focusMode]);
  // Night view also dims the GLOBAL chrome (header / bottom nav / page
  // background), but ONLY while the user is on the itinerary — the body
  // class is removed on unmount so other pages stay light.
  useEffect(() => {
    const cls = "trip-night-mode";
    document.body.classList.toggle(cls, nightMode);
    return () => document.body.classList.remove(cls);
  }, [nightMode]);
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
    const live = apiItineraries.find((t) => t.id === idParam);
    if (live) return live;
    // Only fall back to the offline snapshot when the live query hasn't
    // successfully loaded (offline / cold start). If it loaded and the trip
    // simply isn't in the user's list, it was deleted/removed — show "not
    // found" rather than a stale snapshot.
    if (!itinerariesLoaded) return offline.offlineData ?? undefined;
    return undefined;
  }, [apiItineraries, idParam, itinerariesLoaded, offline.offlineData]);

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
  const emailTripExport = useEmailTripExport();
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

  // Drives the focused "Edit basic info" modal opened from the basic-info
  // card. Activities are edited inline on the day list; this only covers
  // name / destination / organizer / budget / dates.
  const editBasicInfoRef = useRef<ModalButtonHandle>(null);

  // Hoisted early so callbacks below can reference it in their deps
  // arrays without tripping a TDZ error.
  const persistedStatusName = apiTrip?.status?.name ?? TRIP_STATUS.PLANNING;

  const isOrganizer = useMemo(
    () => isCurrentUserOrganizer(apiTrip, currentUser?.id),
    [apiTrip, currentUser?.id],
  );

  // Persist the given trip snapshot to the backend. Shared by every
  // auto-save path on this page — Planning is always in edit mode (no
  // separate Save Trip button), so each add / edit / delete / budget /
  // status / paid change pushes immediately. Guards against firing a
  // second save while one is already in flight: the backend's
  // soft-delete-then-reinsert save_itinerary duplicates every activity
  // when two saves race, so we serialize on the client. The change is
  // already in localTripData, so the UI stays correct; the next edit
  // picks up the latest state and persists it in one save.
  const autoPersist = useCallback(
    (next: TripState) => {
      if (!apiTrip?.interaryType?.id) return;
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
          err instanceof Error ? err.message : "Failed to save the change.",
        );
      });
    },
    [apiTrip, saveItinerary, notifyParticipants, activityStatusLookup],
  );

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

      if (!localTripData) return;
      const next = produce(localTripData, (draft) => {
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
      setLocalTripData(next);

      // Planning is always-editable and self-saving — persist the budget
      // change immediately. Gated on the status lookup being warm so
      // activities don't serialize with unresolved status UUIDs.
      if (
        isOrganizer &&
        persistedStatusName === TRIP_STATUS.PLANNING &&
        activityStatusLookup.size > 0
      ) {
        autoPersist(next);
      }
    },
    [
      localTripData,
      isOrganizer,
      persistedStatusName,
      activityStatusLookup,
      autoPersist,
    ],
  );

  // Apply an add/edit/delete from the activity card chain to localTripData,
  // then auto-save (see the policy block at the end of the callback). The
  // Activities row already enforces organizer-only via `isViewMode` (the
  // affordances are hidden when view-mode is on), so we don't re-check
  // permissions here beyond the `isOrganizer` gate on the save itself.
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
        if (!dest) return;

        if (type === "add") {
          // A destination whose transport is a header flight (or one added
          // with no activity yet) has no itinerary day to drop the place on.
          // Create the day on demand — anchored to this day block's date —
          // instead of silently no-opping, which is what made adding an
          // activity to such a destination fail (or land on the wrong one).
          if (!dest.itinerary) dest.itinerary = [];
          let day = dest.itinerary.find((d) => isSameDay(d.date, date));
          if (!day) {
            day = { id: Date.now(), date, activities: [] };
            dest.itinerary.push(day);
          }
          // Local numeric id — `tripStateToSaveInput` ignores it when shaping
          // the GraphQL payload, and the backend issues real UUIDs on save.
          const maxId = dest.itinerary.reduce(
            (m, d) =>
              Math.max(m, ...(d.activities ?? []).map((a) => Number(a.id) || 0)),
            0,
          );
          const newActivity = { ...(value as Partial<Activity>), id: maxId + 1 } as Activity;
          day.activities = [...(day.activities ?? []), newActivity];
          return;
        }

        // edit / delete operate on an existing day only.
        if (!dest.itinerary) return;
        const day = dest.itinerary.find((d) => isSameDay(d.date, date));
        if (!day) return;

        if (type === "edit") {
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

      // Auto-save policy. There is no manual Save Trip button — the
      // day list is always editable while the trip is in Planning, so
      // every change persists immediately. Three paths:
      //
      //  1. Planning — any add / edit / delete / status toggle persists.
      //     Gated on the status lookup being warm so activities don't
      //     serialize with unresolved status UUIDs (the cold-cache
      //     `{ id: 0, name: … }` fallback resolves to null, and the
      //     post-save refetch would revert the change — the "checkmark
      //     flicks but doesn't update" bug).
      //  2. Confirmed — only the one-tap Complete tick persists; the
      //     rest of the card is locked. Same lookup guard as above.
      //  3. Any stage except Cancelled — paid-attestation edits persist.
      //     No lookup guard: paid edits don't touch activity status, so
      //     an empty lookup can't corrupt the payload.
      const lookupReady = activityStatusLookup.size > 0;
      const shouldAutoSave =
        isOrganizer &&
        ((persistedStatusName === TRIP_STATUS.PLANNING && lookupReady) ||
          (persistedStatusName === TRIP_STATUS.CONFIRMED &&
            lookupReady &&
            isMarkActivityCompletedEvent(event)) ||
          (persistedStatusName !== TRIP_STATUS.CANCELLED &&
            isPaidEditEvent(event)));
      if (shouldAutoSave) autoPersist(next);
    },
    [
      localTripData,
      isOrganizer,
      persistedStatusName,
      activityStatusLookup,
      autoPersist,
    ],
  );

  // Add / edit / delete a destination on the saved trip. Previously this
  // page never wired `onChangeDestination`, so on a multi-destination trip
  // clicking "Add Destination" hit an undefined callback — no state change,
  // no save, no network request ("nothing happens"). Mirror handleChangePlace:
  // apply to localTripData, then auto-save while Planning.
  const handleChangeDestination = useCallback(
    (event: TripDestinationEvent) => {
      if (!localTripData) return;
      const { activity, startDate, endDate, removeIndexes = [] } = event;
      const { type, value, index } = activity;
      const next = produce(localTripData, (draft) => {
        const dests = draft.destinations ?? [];
        if (type === "add") {
          const maxId = dests.reduce(
            (m, d) => Math.max(m, Number(d.id) || 0),
            0,
          );
          const draftDest = value as Partial<Destination>;
          dests.push({
            ...(draftDest as Destination),
            startDate,
            endDate,
            id: maxId + 1,
            itinerary: draftDest.itinerary ?? [],
          });
          draft.destinations = dests;
        } else if (type === "edit") {
          const draftDest = value as Partial<Destination>;
          // Match the destination by its real id first. The `index` handed up
          // by DestinationDetail is the dates-array (calendar-block) index,
          // which does NOT line up with the destinations array when two
          // destinations share a date — editing one then left a stale
          // duplicate behind. Fall back to the index only when no id rides
          // along.
          const targetIdx =
            draftDest.id != null
              ? dests.findIndex((d) => d.id === draftDest.id)
              : typeof index === "number"
                ? index
                : -1;
          const existing = dests[targetIdx];
          if (existing) {
            dests[targetIdx] = {
              ...existing,
              ...draftDest,
              startDate,
              endDate,
            } as Destination;
          }
          if (removeIndexes.length) {
            draft.destinations = dests.filter(
              (d) => !removeIndexes.includes(d.id),
            );
          }
        } else if (type === "delete") {
          draft.destinations = dests.filter((d) => d.id !== value);
        }
      });
      setLocalTripData(next);

      // Persist immediately while Planning. No activity-status-lookup gate
      // here (unlike handleChangePlace): a destination add/edit/delete
      // doesn't serialize per-activity status UUIDs, and gating on the
      // lookup meant a slow/failed status query silently skipped the save —
      // so the new destination vanished on the next refetch.
      if (isOrganizer && persistedStatusName === TRIP_STATUS.PLANNING) {
        autoPersist(next);
      }
    },
    [localTripData, isOrganizer, persistedStatusName, autoPersist],
  );

  const handleSaveBasicInfo = useCallback(
    async (next: TripState): Promise<boolean> => {
      if (!apiTrip || !apiTrip.interaryType?.id) return false;
      setSaveError(null);
      setLocalTripData(next); // optimistic
      try {
        const input = tripStateToSaveInput(next, {
          id: apiTrip.id,
          interaryTypeId: apiTrip.interaryType.id,
          tripStatusId: apiTrip.status?.id ?? null,
          notifyParticipants,
          activityStatusLookup,
        });
        await saveItinerary.mutateAsync(input);
        // Collapse the "Trip details" overview card after a successful
        // edit — the modal closes itself, and hiding the card returns the
        // user to the clean itinerary view they edit from.
        setShowBasicInfo(false);
        setSuccessToast("Trip info saved.");
        return true;
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save trip info.",
        );
        return false;
      }
    },
    [apiTrip, notifyParticipants, activityStatusLookup, saveItinerary],
  );

  // The "Trip details" overview is an independent toggle — the day list
  // is always editable in Planning, so opening / closing the overview
  // never touches activity state.
  const handleToggleBasicInfo = useCallback(() => {
    setShowBasicInfo((prev) => !prev);
  }, []);

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

  const isLocked = LOCKED_STATUS_NAMES.has(persistedStatusName);

  // Activity editing on the day list is enabled only for the organizer
  // while the trip is in Planning — once Confirmed the activities lock
  // and the only legitimate trip-level change is the "Mark complete"
  // promotion (handled by TripStatusBadge). There is no separate "Edit"
  // step: in Planning the list is always editable and self-saving.
  const canEditActivities =
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
    async (next: TripStatus, opts?: { confirmAllActivities?: boolean }) => {
      if (!apiTrip || !tripData || !apiTrip.interaryType?.id) return;
      setSaveError(null);
      const previousStatus = persistedStatusName;
      // When the user promotes Planning → Confirmed and chose "confirm all"
      // from the prompt, flip every activity to Confirmed in the SAME save —
      // so a Confirmed trip never carries leftover Planning activities, and
      // there's no second racing save (which the soft-delete-then-reinsert
      // save path would duplicate).
      let effectiveTrip = tripData;
      if (opts?.confirmAllActivities) {
        const confirmedId = activityStatusLookup.get(TRIP_STATUS.CONFIRMED);
        effectiveTrip = produce(tripData, (draft) => {
          for (const dest of draft.destinations ?? []) {
            for (const day of dest.itinerary ?? []) {
              for (const act of day.activities ?? []) {
                act.status = {
                  id: confirmedId ?? 0,
                  name: TRIP_STATUS.CONFIRMED,
                };
              }
            }
          }
        });
        setLocalTripData(effectiveTrip);
      }
      try {
        const input = tripStateToSaveInput(effectiveTrip, {
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
          // Auto-export: email the itinerary (PDF + Excel) to all members,
          // organizer included — that's how the organizer gets their own
          // confirmed copy (they're excluded from save notifications). Fire-
          // and-forget: a slow/failed export must never block the confirm,
          // which already succeeded above. Reuses the in-app export output.
          const confirmedTrip = effectiveTrip;
          const tripId = apiTrip.id;
          void (async () => {
            try {
              const [pdf, excel] = await Promise.all([
                getTripPdfBlob(confirmedTrip),
                getTripExcelBlob(confirmedTrip),
              ]);
              const result = await emailTripExport.mutateAsync({
                tripId,
                pdf,
                excel,
                tripName: confirmedTrip.name ?? undefined,
              });
              if (result.recipients > 0) {
                setSuccessToast(
                  `Itinerary emailed to ${result.recipients} ${
                    result.recipients === 1 ? "person" : "people"
                  }.`
                );
              }
            } catch {
              setReminderToast(
                "Couldn't email the itinerary — you can still share it from the ⋮ menu."
              );
            }
          })();
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to update trip status.",
        );
        // Re-throw so the modal's await catches and keeps itself open.
        throw err;
      }
    },
    [
      apiTrip,
      tripData,
      saveItinerary,
      notifyParticipants,
      persistedStatusName,
      activityStatusLookup,
      emailTripExport,
    ],
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

  // "Duplicate this trip" is offered once a trip has run its course
  // (Completed) or been called off (Cancelled) — the natural moment to
  // re-run it. The copy is a fresh Planning draft, so we don't offer it
  // while the original is still Planning/Confirmed (just keep editing that).
  const canDuplicate =
    persistedStatusName === TRIP_STATUS.COMPLETED ||
    persistedStatusName === TRIP_STATUS.CANCELLED;

  // Active trips (Planning / Confirmed) the copy could collide with — feeds
  // the modal's overlap warning. Completed / Cancelled trips are records,
  // not live plans, so an overlap with them isn't worth flagging.
  const otherTripRanges = useMemo<DuplicateTripRange[]>(
    () =>
      apiItineraries
        .filter(
          (t) =>
            t.id !== apiTrip?.id &&
            !!t.startDate &&
            !!t.endDate &&
            (t.status?.name === TRIP_STATUS.PLANNING ||
              t.status?.name === TRIP_STATUS.CONFIRMED),
        )
        .map((t) => ({
          name: t.name ?? "Untitled trip",
          startDate: t.startDate as string,
          endDate: t.endDate as string,
        })),
    [apiItineraries, apiTrip?.id],
  );

  // Build a Planning copy shifted to the chosen start date, seed it into
  // TripContext, and drop the user into the create/edit stepper with no
  // ?id= (so the next save CREATEs a new trip). resetTrip() first is
  // deliberate: the basicInfo reducer's multi-destination re-anchor fires
  // on a date change when there's no apiId, collapsing any leg whose start
  // matches the *previous* context start. Clearing the context first makes
  // that previous start undefined, so the (correctly pre-shifted) legs are
  // left untouched.
  const handleDuplicate = useCallback(
    (newStartDate: string) => {
      if (!tripData || !apiTrip) return;
      const planning = tripStatuses.find(
        (s) => s.name === TRIP_STATUS.PLANNING,
      );
      const copy = duplicateTripState(tripData, newStartDate, planning);
      dispatch(resetTrip());
      dispatch(basicInfo(copy));
      const route = apiIsSingleTrip(apiTrip)
        ? TRIP_BASIC.SINGLE.route
        : TRIP_BASIC.MULTIPLE.route;
      navigate(route);
    },
    [tripData, apiTrip, tripStatuses, dispatch, navigate],
  );

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
  const [successToast, setSuccessToast] = useState<string | null>(null);
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

  // Show a spinner until the trips list has actually SETTLED (and the
  // IndexedDB snapshot is read) — never flash "Trip not found" while the
  // list is still loading OR refetching. The old guard only checked
  // `isLoading` (first-load), so navigating in with a stale/empty cache —
  // where the list is refetching in the background — fell straight through
  // to the not-found screen before the trip arrived.
  // "Still resolving" = a fetch is in flight (first load OR background
  // refetch) or the offline snapshot hasn't been read yet. When NO fetch is
  // in flight and we still have no trip, it's genuinely not found (or the
  // fetch errored) — only then show the error.
  const tripStillResolving = isLoading || isFetching || !offline.isHydrated;
  if (!apiTrip && tripStillResolving) {
    return (
      <Layout>
        <div className="trip-detail-empty trip-detail-loading">
          <CircularProgress size={28} className="trip-detail-loading-spinner" />
          <p>Loading trip…</p>
        </div>
      </Layout>
    );
  }

  if (!apiTrip || !tripData) {
    return (
      <Layout>
        <div className="trip-detail-notfound" role="alert">
          <WrongLocationRoundedIcon className="trip-detail-notfound-icon" />
          <h2 className="trip-detail-notfound-title">Trip not found</h2>
          <p className="trip-detail-notfound-sub">
            We couldn&rsquo;t find this trip. It may have been deleted, or the
            link points to a trip that&rsquo;s no longer in your list.
          </p>
          <ButtonCustom
            type="standard"
            capitalizeType="none"
            label="Back to my trips"
            onClick={() => navigate("/trips")}
          />
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
        className={classnames(
          "trip-detail-themed",
          `trip-detail-status-${persistedStatusName.toLowerCase()}`,
          {
            "trip-detail-text-only": hideImages,
            "trip-detail-dark": nightMode,
          },
        )}
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
      <Snackbar
        open={!!successToast}
        autoHideDuration={4000}
        // Ignore `clickaway` — the save click / modal-close that triggers
        // this toast can otherwise dismiss it the instant it mounts.
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setSuccessToast(null);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 1500 }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessToast(null)}
          sx={{ maxWidth: 640, width: '100%' }}
        >
          {successToast}
        </Alert>
      </Snackbar>
      <Grid container>
        {/* Standalone trip header — title + action buttons. Lives
            OUTSIDE BasicTripInfo so Hide detail can unmount the basic-
            info + budget cards without taking the title/buttons with
            them. Hidden entirely in focus mode — the only control then is
            the floating "Show overview" pill (rendered below). */}
        {!focusMode && (
        <Grid item lg={12} md={12} xs={12}>
          <TripDetailHeader
            tripData={tripData}
            statusName={persistedStatusName}
            canExport={canExport}
            canPromoteStatus={canPromoteStatus}
            canCancelTrip={canCancelTrip}
            isOrganizer={isOrganizer}
            isPro={Boolean(currentUser?.isPaidMember || isAdmin)}
            isSaving={saveItinerary.isPending}
            isDeleting={deleteItinerary.isPending}
            onEditTrip={handleChangeStep}
            onStartTour={handleDetailTourStart}
            basicInfoOpen={showBasicInfo}
            onToggleBasicInfo={handleToggleBasicInfo}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((prev) => !prev)}
            hideImages={hideImages}
            onToggleHideImages={() => setHideImages((prev) => !prev)}
            nightMode={nightMode}
            onToggleNight={() => setNightMode((prev) => !prev)}
            onPrint={() => {
              if (!tripData) return;
              void printTripPdf(tripData);
            }}
            onDownloadExcel={handleExportExcel}
            onDownloadPdf={handleExportPdf}
            onStatusChange={handleStatusChange}
            onCancelTrip={handleCancelTrip}
            onDeleteTrip={handleDeleteTrip}
            canDuplicate={canDuplicate}
            otherTripRanges={otherTripRanges}
            onDuplicate={handleDuplicate}
            showNotifyToggle={
              isOrganizer &&
              (apiTrip.friends.length + apiTrip.organizers.length) > 1
            }
            notifyParticipants={notifyParticipants}
            onChangeNotifyParticipants={setNotifyParticipants}
            offlineStatus={offline.status}
            offlineSavedAt={offline.savedAt}
            isOffline={isOffline}
            onDownloadOffline={() => {
              if (apiTrip) void offline.download(apiTrip);
            }}
            onRemoveOffline={() => void offline.remove()}
          />
        </Grid>
        )}
        {/* Collapsible "Trip details" overview — the basic-info card
            (organizer / where / when / budget / who's going). The toggle
            that opens it lives up in the header action row; this just
            renders the expanded card. */}
        {!focusMode && showBasicInfo && (
          <Grid item lg={12} md={12} xs={12} className="trip-detail-basic-info-row">
            <div className="trip-detail-basic-info-card">
              <BasicTripInfo
                data={tripData}
                onChangeStep={handleChangeStep}
                hideHeader
                // Edit sits ABOVE the stats (top of the card body), not
                // overlapping the Organizer tile. Organizer + Planning gated.
                // Opens a focused modal on this page rather than navigating
                // to the full stepper editor.
                onEditBasicInfo={
                  canEditActivities
                    ? () => editBasicInfoRef.current?.openModel()
                    : undefined
                }
              />
            </div>
            <EditBasicInfoModal
              ref={editBasicInfoRef}
              data={tripData}
              isSaving={saveItinerary.isPending}
              saveError={saveError}
              onSave={handleSaveBasicInfo}
            />
          </Grid>
        )}
        {/* Trip expenses meter placement is status-driven:
            - Planning: always visible OUTSIDE the "Trip details" collapse
              — active spend-tracking the user wants front-and-center while
              building the trip.
            - Confirmed / Completed / Cancelled: folded back INTO the
              collapse (only shown when "Trip details" is expanded) — the
              trip is locked, so the running meter is reference info, not a
              primary surface. */}
        {focusMode ? null : persistedStatusName === TRIP_STATUS.PLANNING ? (
          <Grid item lg={12} md={12} xs={12}>
            <BudgetSummary data={tripData} />
          </Grid>
        ) : (
          showBasicInfo && (
            <Grid item lg={12} md={12} xs={12}>
              <BudgetSummary data={tripData} />
            </Grid>
          )
        )}
        {!focusMode && persistedStatusName === TRIP_STATUS.COMPLETED && (
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
        {!focusMode && persistedStatusName === TRIP_STATUS.CANCELLED && (
          <Grid item lg={12} md={12} xs={12}>
            <div className="trip-detail-cancelled-banner">
              <EventBusyRoundedIcon
                className="trip-detail-cancelled-icon"
                fontSize="medium"
              />
              <div className="trip-detail-cancelled-text">
                <span className="trip-detail-cancelled-title">
                  Trip cancelled
                </span>
                <span className="trip-detail-cancelled-sub">
                  This trip is cancelled. The itinerary stays viewable as a
                  record, but it&rsquo;s no longer active.
                </span>
              </div>
            </div>
          </Grid>
        )}
        {/* AI trip-checkup needs the network — hide it offline so the user
            isn't left with a dead "run checkup" button. */}
        {!focusMode && apiTrip && !isOffline && (
          <Grid item lg={12} md={12} xs={12}>
            <TripCheckupCard
              tripId={apiTrip.id}
              isPro={Boolean(currentUser?.isPaidMember || isAdmin)}
              isPlanning={persistedStatusName === TRIP_STATUS.PLANNING}
            />
            {/* Hidden for now — "More ideas" / "Get activity ideas" entry.
                Restore by un-commenting when the suggestions feature is
                re-enabled on this page.
            <TripSuggestionsCard
              tripId={apiTrip.id}
              isPro={Boolean(currentUser?.isPaidMember || isAdmin)}
              isPlanning={persistedStatusName === TRIP_STATUS.PLANNING}
              isOrganizer={isOrganizer}
              destinations={destinations}
              onAddPlace={handleChangePlace}
            /> */}
          </Grid>
        )}
        {!focusMode && persistedStatusName === TRIP_STATUS.PLANNING && (
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
                    ? "Your itinerary is fully editable — add, edit, or remove activities and changes save as you go."
                    : "The organizer is still arranging activities. Check back soon."}
                </span>
              </div>
              {/* Confirm trip lives inside the planning box — the box already
                  frames the "you're still planning" state. If any activities
                  are still unconfirmed, the button's own prompt offers to
                  confirm them all in one go (see TripStatusBadge), so there's
                  no separate "Confirm all activities" button. */}
              {canPromoteStatus && (
                <div className="trip-detail-planning-actions">
                  <TripStatusBadge
                    data={tripData}
                    onStatusChange={handleStatusChange}
                    isSaving={saveItinerary.isPending}
                    onEditTripDates={handleChangeStep}
                    className="trip-detail-status-cta-btn trip-detail-planning-confirm"
                  />
                </div>
              )}
            </div>
          </Grid>
        )}
        {/* Mark-complete CTA above the itinerary — Confirmed only. The
            Planning equivalent (Confirm trip) lives inside the "Trip in
            planning" box instead. Completed / Cancelled have no forward
            action so the card doesn't render. */}
        {!focusMode &&
          persistedStatusName === TRIP_STATUS.CONFIRMED &&
          canPromoteStatus && (
          <Grid item lg={12} md={12} xs={12}>
            <div className="trip-detail-status-cta">
              <EmojiEventsRoundedIcon
                className="trip-detail-status-cta-icon"
                fontSize="medium"
              />
              <div className="trip-detail-status-cta-text">
                <span className="trip-detail-status-cta-title">
                  Trip all wrapped up?
                </span>
                <span className="trip-detail-status-cta-sub">
                  Mark it complete to archive it as a record of where
                  you&rsquo;ve been.
                </span>
              </div>
              <TripStatusBadge
                data={tripData}
                onStatusChange={handleStatusChange}
                isSaving={saveItinerary.isPending}
                onEditTripDates={handleChangeStep}
                className="trip-detail-status-cta-btn"
              />
            </div>
          </Grid>
        )}
        <Grid item lg={12}>
          {/* In Planning the day list is always editable for the
              organizer — add / edit / delete / status / budget all
              persist immediately via handleChangePlace's auto-save
              (there is no separate "Edit" step or Save Trip button).
              Once the trip is Confirmed or later, the list locks to
              read-only and only the one-tap Complete tick + paid
              settlement stay live. */}
          <DestinationDetail
            type={tripData.type}
            isViewMode={!canEditActivities}
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
            onChangeDestination={handleChangeDestination}
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
      {/* Focus-mode exit — a floating pill (the header is hidden, so an
          inline button would dangle in empty space). Fixed bottom-right,
          out of the way of the itinerary but always reachable. */}
      {focusMode && (
        <button
          type="button"
          className="trip-detail-focus-fab"
          onClick={() => setFocusMode(false)}
          aria-label="Show trip overview"
        >
          <FullscreenExitRoundedIcon fontSize="small" />
          <span>Show</span>
        </button>
      )}
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
  isPro: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onEditTrip: () => void;
  onStartTour: () => void;
  basicInfoOpen: boolean;
  onToggleBasicInfo: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  hideImages: boolean;
  onToggleHideImages: () => void;
  nightMode: boolean;
  onToggleNight: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  onStatusChange: (next: TripStatus) => void | Promise<void>;
  onCancelTrip: () => void | Promise<void>;
  onDeleteTrip: () => void | Promise<void>;
  /** Completed / Cancelled trips can be cloned into a fresh Planning copy. */
  canDuplicate: boolean;
  /** Active trips used to warn about overlapping dates in the copy modal. */
  otherTripRanges: DuplicateTripRange[];
  onDuplicate: (newStartDate: string) => void;
  /** Only true for organizers on trips with other participants. Solo
   *  trips don't render the toggle at all — there's nobody to notify. */
  showNotifyToggle: boolean;
  notifyParticipants: boolean;
  onChangeNotifyParticipants: (next: boolean) => void;
  /** Offline-download state + actions for the "Download offline" control. */
  offlineStatus: OfflineStatus;
  offlineSavedAt: number | null;
  isOffline: boolean;
  onDownloadOffline: () => void;
  onRemoveOffline: () => void;
}

const TripDetailHeader = ({
  tripData,
  statusName,
  canExport,
  canPromoteStatus,
  canCancelTrip,
  isOrganizer,
  isPro,
  isSaving,
  isDeleting,
  onEditTrip,
  onStartTour,
  basicInfoOpen,
  onToggleBasicInfo,
  focusMode,
  onToggleFocus,
  hideImages,
  onToggleHideImages,
  nightMode,
  onToggleNight,
  onPrint,
  onDownloadExcel,
  onDownloadPdf,
  onStatusChange,
  onCancelTrip,
  onDeleteTrip,
  canDuplicate,
  otherTripRanges,
  onDuplicate,
  showNotifyToggle,
  notifyParticipants,
  onChangeNotifyParticipants,
  offlineStatus,
  offlineSavedAt,
  isOffline,
  onDownloadOffline,
  onRemoveOffline,
}: TripDetailHeaderProps) => {
  const exportModalRef = useRef<ModalButtonHandle>(null);
  const notifyPrefModalRef = useRef<ModalButtonHandle>(null);
  const duplicateModalRef = useRef<ModalButtonHandle>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    null | "cancel" | "delete"
  >(null);
  // On mobile the header action row is tight, so the offline control moves
  // off the row into the kebab menu (see the offline item there). Desktop
  // keeps the richer inline button/chip.
  const isMobile = useMediaQuery("(max-width: 720px)");
  const showOffline =
    !focusMode && statusName === TRIP_STATUS.CONFIRMED;

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

  // The title row no longer carries a status pill at all — every
  // lifecycle state communicates status through a dedicated banner /
  // card in the body (Planning, Confirmed, Completed, Cancelled), so a
  // chip next to the name was redundant chrome. Promotion actions
  // ("Confirm trip" / "Mark complete") live in those body cards too.

  return (
    <div className="trip-detail-header">
      {/* Focus mode strips the title row entirely — name + bell — so the
          page is just the itinerary with a single "Show overview" exit
          button on the right. */}
      <div className="trip-detail-header-title">
        {!focusMode && (
          <h2 className="trip-detail-name">{tripName || "Untitled trip"}</h2>
        )}
        {/* Participant-notification bell sits right next to the trip name
            — it's tied to the trip identity (broadcast changes to the
            people on THIS trip), not to the export/overview action
            cluster on the right. Hidden on Cancelled trips: the itinerary
            is inactive, so there are no changes to broadcast. */}
        {!focusMode &&
          showNotifyToggle &&
          statusName !== TRIP_STATUS.CANCELLED && (
            <NotifyParticipantsCheckbox
              checked={notifyParticipants}
              onChange={onChangeNotifyParticipants}
              disabled={isSaving || isDeleting}
            />
          )}
      </div>
      {/* Recap note — a retrospective, so it's only offered once the trip
          is done (Completed) or called off (Cancelled), never during
          Planning/Confirmed. Its own full-width row under the title
          (flex-basis:100% forces the wrap). Owner/organizer edits; persists
          via its own endpoint. Hidden in focus mode. */}
      {!focusMode &&
        tripData.apiId &&
        (statusName === TRIP_STATUS.COMPLETED ||
          statusName === TRIP_STATUS.CANCELLED) && (
          <div className="trip-detail-note-row">
            <TripNote
              tripId={tripData.apiId}
              note={tripData.note}
              canEdit={isOrganizer}
            />
          </div>
        )}
      <div className="trip-detail-header-actions">
        {/* Two groups: "Trip details" alone on the left, and everything else
            (Focus / Text only / Offline / kebab) together on the right —
            split to opposite edges on every viewport. */}
        <div className="trip-detail-actions-left">
          {!focusMode && (
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
          )}
        </div>
        <div className="trip-detail-actions-right">
        {/* Focus mode: hides every overview card so the page is just the
            dates + activities. Toggling it back reveals the overview. */}
        <button
          type="button"
          className={classnames(
            "trip-detail-basic-info-toggle",
            "trip-detail-focus-toggle",
            "trip-detail-focusmode-toggle",
            { "is-active": focusMode },
          )}
          onClick={onToggleFocus}
          aria-pressed={focusMode}
          title={focusMode ? "Show trip overview" : "Focus on the itinerary"}
        >
          {focusMode ? (
            <FullscreenExitRoundedIcon fontSize="small" />
          ) : (
            <FullscreenRoundedIcon fontSize="small" />
          )}
          <span className="trip-detail-focus-label">
            {focusMode ? "Show overview" : "Focus"}
          </span>
        </button>
        {/* Text-only mode: hide activity hero images for a dense, scannable
            itinerary. Useful both in and out of focus mode. */}
        <button
          type="button"
          className={classnames(
            "trip-detail-basic-info-toggle",
            "trip-detail-focus-toggle",
            "trip-detail-textonly-toggle",
            { "is-active": hideImages },
          )}
          onClick={onToggleHideImages}
          aria-pressed={hideImages}
          title={hideImages ? "Show activity images" : "Hide activity images"}
        >
          {hideImages ? (
            <ImageOutlinedIcon fontSize="small" />
          ) : (
            <HideImageOutlinedIcon fontSize="small" />
          )}
          <span className="trip-detail-focus-label">
            {hideImages ? "Show images" : "Text only"}
          </span>
        </button>
        {/* Night view: dark theme scoped to the itinerary page only. */}
        <button
          type="button"
          className={classnames(
            "trip-detail-basic-info-toggle",
            "trip-detail-focus-toggle",
            "trip-detail-night-toggle",
            { "is-active": nightMode },
          )}
          onClick={onToggleNight}
          aria-pressed={nightMode}
          title={nightMode ? "Switch to day view" : "Switch to night view"}
        >
          {nightMode ? (
            <LightModeOutlinedIcon fontSize="small" />
          ) : (
            <DarkModeOutlinedIcon fontSize="small" />
          )}
          <span className="trip-detail-focus-label">
            {nightMode ? "Day" : "Night"}
          </span>
        </button>
        {/* Save the itinerary for offline use. Available to any viewer (not
            organizer-gated like export) — anyone can keep their own copy to
            read abroad with no data. Gated to Confirmed trips only: a
            Planning itinerary is still changing, so an offline snapshot
            would go stale; once Confirmed the plan is locked and worth
            carrying abroad. */}
        {showOffline && !isMobile && (
          <TripOfflineButton
            status={offlineStatus}
            savedAt={offlineSavedAt}
            isOffline={isOffline}
            onDownload={onDownloadOffline}
            onRemove={onRemoveOffline}
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
            are gated to organizers via the per-item flags below. Hidden in
            focus mode so the header is just the "Show overview" exit. */}
        {!focusMode && (
          <IconButton
            className="trip-detail-menu-btn"
            aria-label="More actions"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            disabled={isSaving || isDeleting}
            size="small"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
        <Menu anchorEl={menuAnchor} onClose={closeMenu}>
          {/* Tour walks through planning an active trip — pointless once
              the trip is Cancelled (read-only, inactive), so hide it. */}
          {statusName !== TRIP_STATUS.CANCELLED && (
            <MenuActionItem
              icon={<HelpOutlineRoundedIcon />}
              label="Take the tour"
              onClick={() => {
                closeMenu();
                onStartTour();
              }}
            />
          )}
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
          {/* Any member can set how THEY are notified about this trip. */}
          {tripData.apiId && (
            <MenuActionItem
              icon={<NotificationsActiveRoundedIcon />}
              label="Trip notifications"
              onClick={() => {
                closeMenu();
                notifyPrefModalRef.current?.openModel();
              }}
            />
          )}
          {/* Offline lives in the menu on mobile (the header row is too
              tight for it there); desktop keeps the inline button above. */}
          {showOffline &&
            isMobile &&
            (offlineStatus === OFFLINE_STATUS.SAVED ? (
              <MenuActionItem
                icon={<CloudDoneRoundedIcon />}
                label="Remove offline copy"
                onClick={() => {
                  closeMenu();
                  onRemoveOffline();
                }}
              />
            ) : offlineStatus === OFFLINE_STATUS.SYNCING ? (
              <MenuActionItem
                icon={<SyncRoundedIcon />}
                label="Saving offline…"
                onClick={closeMenu}
              />
            ) : (
              <MenuActionItem
                icon={<DownloadForOfflineOutlinedIcon />}
                label={isOffline ? "Save offline (connect first)" : "Save offline"}
                onClick={() => {
                  closeMenu();
                  if (!isOffline) onDownloadOffline();
                }}
              />
            ))}
          {canDuplicate && (
            <MenuActionItem
              icon={<ContentCopyRoundedIcon />}
              label="Duplicate trip"
              onClick={() => {
                closeMenu();
                duplicateModalRef.current?.openModel();
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
        {tripData.apiId && (
          <TripNotificationPrefModal
            ref={notifyPrefModalRef}
            tripId={tripData.apiId}
            isPro={isPro}
          />
        )}
        {canDuplicate && (
          <DuplicateTripModal
            ref={duplicateModalRef}
            data={tripData}
            otherTrips={otherTripRanges}
            onConfirm={onDuplicate}
          />
        )}
        </div>
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
