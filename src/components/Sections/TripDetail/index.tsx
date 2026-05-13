import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./index.scss";
import { Grid } from "@mui/material";
import Layout from "components/common/Layout/SubLayout";
import BasicTripInfo from "components/BasicTripInfo";
import BudgetSummary from "components/BudgetSummary";
import DestinationDetail from "components/DestinationDetail";
import { useUser } from "context/UserContext";
import { basicInfo, useTripDispatch } from "context/TripContext";
import { useMyItineraries } from "api/hooks/useItineraries";
import {
  apiIsSingleTrip,
  apiToTripState,
  isCurrentUserOrganizer,
} from "utils/itineraryAdapter";
import { TRIP_BASIC } from "constants";
import { exportTripToExcel } from "utils/exportTripExcel";
import type { TripState, TripStatus } from "types";

// "Confirmed" and beyond are read-only — once a trip is locked in, edits
// require flipping back to Planning (which itself requires unconfirming
// every activity, enforced by the status modal).
const LOCKED_STATUS_NAMES = new Set(["Confirmed", "Completed", "Cancelled"]);

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

  const [statusOverride, setStatusOverride] = useState<TripStatus | null>(null);

  const tripData = useMemo<TripState | null>(() => {
    if (!baseTripData) return null;
    return statusOverride
      ? { ...baseTripData, status: statusOverride }
      : baseTripData;
  }, [baseTripData, statusOverride]);

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
    navigate(route);
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
            onChangeBudget={() => {}}
          />
        </Grid>
      </Grid>
    </Layout>
  );
};

export default TripDetail;
