import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { produce } from "immer";
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
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Layout from "components/common/Layout/SubLayout";
import BasicTripInfo from "components/BasicTripInfo";
import BudgetSummary from "components/BudgetSummary";
import DestinationDetail from "components/DestinationDetail";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import ModalButton, {
  type ModalButtonHandle,
} from "components/ModalButton";
import NotifyParticipantsCheckbox from "components/NotifyParticipantsCheckbox";
import TripStatusBadge from "components/TripStatusBadge";
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
import { buildSharePreviewUrl } from "utils/sharePreviewUrl";
import { isSameDay } from "utils";
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
      if (
        apiTrip &&
        apiTrip.interaryType?.id &&
        persistedStatusName === TRIP_STATUS.CONFIRMED &&
        isMarkActivityCompletedEvent(event) &&
        activityStatusLookup.size > 0
      ) {
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
              : "Failed to mark the activity completed.",
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
        notifyParticipants,
        activityStatusLookup,
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
  }, [apiTrip, tripData, statusOverride, saveItinerary, notifyParticipants]);

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

  // Once the trip is past Planning, both the basic-info stats and the
  // budget bar collapse behind a SINGLE Show/Hide detail button driven
  // here — the trip-header (name + action buttons) stays visible at
  // the top regardless. While editing (Planning), the cards stay open
  // so the user has the overview at a glance.
  const [detailsCollapsed, setDetailsCollapsed] = useState(isLocked);
  // Re-sync the collapse state when the persisted status flips
  // (e.g. user marks a Planning trip Confirmed; we want it to snap to
  // the post-planning collapsed default).
  useEffect(() => {
    setDetailsCollapsed(isLocked);
  }, [isLocked]);

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
          notifyParticipants,
          activityStatusLookup,
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
    [apiTrip, tripData, saveItinerary, notifyParticipants],
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
      <Grid container>
        {/* Standalone trip header — title + action buttons. Lives
            OUTSIDE BasicTripInfo so Hide detail can unmount the basic-
            info + budget cards without taking the title/buttons with
            them. */}
        <Grid item lg={12} md={12} xs={12}>
          <TripDetailHeader
            tripData={tripData}
            statusName={persistedStatusName}
            canSaveTrip={canSaveTrip}
            canExport={canExport}
            canPromoteStatus={canPromoteStatus}
            canCancelTrip={canCancelTrip}
            isOrganizer={isOrganizer}
            isSaving={saveItinerary.isPending}
            isDeleting={deleteItinerary.isPending}
            onEditTrip={handleChangeStep}
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
        <Grid item lg={12} md={12} xs={12} className="trip-detail-toggle-row">
          <button
            type="button"
            className="trip-detail-toggle"
            aria-expanded={!detailsCollapsed}
            onClick={() => setDetailsCollapsed((c) => !c)}
          >
            {detailsCollapsed ? "Show detail" : "Hide detail"}
          </button>
        </Grid>
        {!detailsCollapsed && (
          <>
            <Grid item lg={12} md={12} xs={12}>
              <BasicTripInfo
                data={tripData}
                onChangeStep={handleChangeStep}
                onStatusChange={handleStatusChange}
                isViewMode={isViewMode}
                hideHeader
                isSaving={saveItinerary.isPending}
                saveError={saveError}
              />
            </Grid>
            <Grid item lg={12} md={12} xs={12}>
              <BudgetSummary data={tripData} />
            </Grid>
          </>
        )}
        <Grid item lg={12}>
          {/* Activity cards on /trip-detail are read-only by design — the
              Edit Trip button (and the trip-name pencil) navigate to the
              stepper editor where the inline edit affordances live. */}
          <DestinationDetail
            type={tripData.type}
            isViewMode={true}
            startDate={tripData.startDate}
            participants={participants}
            endDate={tripData.endDate}
            destinations={destinations}
            onChangePlace={handleChangePlace}
            onChangeBudget={handleChangeBudget}
            tripStatusName={persistedStatusName}
          />
        </Grid>
      </Grid>
    </Layout>
  );
};

interface TripDetailHeaderProps {
  tripData: TripState;
  statusName: string;
  canSaveTrip: boolean;
  canExport: boolean;
  canPromoteStatus: boolean;
  canCancelTrip: boolean;
  isOrganizer: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onEditTrip: () => void;
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
  canSaveTrip,
  canExport,
  canPromoteStatus,
  canCancelTrip,
  isOrganizer,
  isSaving,
  isDeleting,
  onEditTrip,
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

  /** First country with an image, else first destination's country
   *  image, else the trip's own image. Drives the og:image on the
   *  share preview so the unfurl carries a visual. */
  const resolveShareImage = (): string | null => {
    if (tripData.image) return tripData.image;
    for (const dest of tripData.destinations ?? []) {
      if (dest.country?.image) return dest.country.image;
    }
    return null;
  };

  /** One-line pitch used as og:description. Skips the URL — that's
   *  already attached to the share separately — and the bullet
   *  emojis (FB / X strip them or render them as raw Unicode in the
   *  card, which reads worse than plain text). */
  const buildShareDescription = () => {
    const parts: string[] = [];
    if (tripData.startDate && tripData.endDate) {
      parts.push(`${tripData.startDate} → ${tripData.endDate}`);
    }
    const countries = (tripData.destinations ?? [])
      .map((d) => d.country?.name)
      .filter((n): n is string => Boolean(n));
    if (countries.length) parts.push(countries.join(" · "));
    return parts.length
      ? `My trip on DaTryp.com — ${parts.join(" · ")}`
      : "My trip itinerary on DaTryp.com";
  };

  const buildSharePreview = () => {
    const canonical = buildCanonicalUrl();
    if (!canonical) return "";
    const tripTitle = tripData.name?.trim() || "My trip";
    return buildSharePreviewUrl({
      title: tripTitle,
      description: buildShareDescription(),
      imageUrl: resolveShareImage(),
      canonicalUrl: canonical,
    });
  };

  /** Plain-text body for surfaces that DON'T unfurl (email + copy). */
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
    // WhatsApp unfurls the LAST URL in the message. Use the preview
    // URL so the crawler reads the trip's OG tags instead of hitting
    // the auth-gated /trip-detail SPA route (which returns "not
    // found" in the chat unfurl).
    const preview = buildSharePreview();
    const tripTitle = tripData.name?.trim() || "My trip";
    const lines: string[] = [`📍 ${tripTitle}`];
    if (tripData.startDate && tripData.endDate) {
      lines.push(`🗓 ${tripData.startDate} → ${tripData.endDate}`);
    }
    const countries = (tripData.destinations ?? [])
      .map((d) => d.country?.name)
      .filter((n): n is string => Boolean(n));
    if (countries.length) lines.push(`✈️ ${countries.join(" · ")}`);
    if (preview) lines.push(preview);
    const text = encodeURIComponent(lines.join("\n"));
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

  return (
    <div className="trip-detail-header">
      <div className="trip-detail-header-title">
        <h2 className="trip-detail-name">{tripName || "Untitled trip"}</h2>
        {/* Bell sits BETWEEN title and status — the broadcast
            affordance reads as paired with the trip name first,
            then the status pill anchors the right side of the
            row. Matches the edit-trip header layout exactly. */}
        {showNotifyToggle && (
          <NotifyParticipantsCheckbox
            checked={notifyParticipants}
            onChange={onChangeNotifyParticipants}
            disabled={isSaving || isDeleting}
          />
        )}
        {/* Status pill — visible for every state so the user always knows
            where the trip is in its lifecycle. */}
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
      </div>
      <div className="trip-detail-header-actions">
        {canSaveTrip && (
          <ButtonCustom
            type="standard"
            capitalizeType="uppercase"
            className="trip-detail-edit-btn"
            label="Edit Trip"
            onClick={onEditTrip}
            disabled={isSaving}
          />
        )}
        {canPromoteStatus && (
          <TripStatusBadge
            data={tripData}
            onStatusChange={onStatusChange}
            isSaving={isSaving}
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
        {isOrganizer && (
          <>
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
              {/* Edit Trip is rendered both as the inline pill (desktop)
                  AND as this menu item (mobile). CSS hides whichever
                  doesn't belong at the current breakpoint — see
                  `.trip-detail-menu-item-edit` in index.scss. */}
              {canSaveTrip && (
                <MenuActionItem
                  icon={<EditRoundedIcon />}
                  label="Edit trip"
                  onClick={() => {
                    closeMenu();
                    onEditTrip();
                  }}
                  className="trip-detail-menu-item-edit"
                />
              )}
              {canCancelTrip && (
                <MenuActionItem
                  icon={<EventBusyRoundedIcon />}
                  label="Cancel trip"
                  onClick={() => openConfirm("cancel")}
                />
              )}
              <MenuActionItem
                icon={<DeleteOutlineRoundedIcon />}
                label="Delete trip"
                onClick={() => openConfirm("delete")}
                tone="danger"
              />
            </Menu>
          </>
        )}
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
