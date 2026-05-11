import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import "./index.css";
import { Grid } from "@mui/material";
import Layout from "components/common/Layout/SubLayout";
import BasicTripInfo from "components/BasicTripInfo";
import BudgetSummary from "components/BudgetSummary";
import DestinationDetail from "components/DestinationDetail";
import { useUser } from "context/UserContext";
import { basicInfo, useTripDispatch } from "context/TripContext";
import { userIntinerary } from "sample/userIntineraries";
import { TRIP_BASIC } from "constants";
import { exportTripToExcel } from "utils/exportTripExcel";
import type {
  Destination,
  Friend,
  MultipleDestinations,
  SingleDestination,
  TripState,
  TripStatus,
} from "types";

const LOCKED_STATUS_NAMES = new Set(["Confirmed", "Completed"]);

type TripEntry = SingleDestination | MultipleDestinations;

const isSingle = (trip: TripEntry): trip is SingleDestination =>
  (trip as SingleDestination).country !== undefined;

const userToFriend = (u: { id: number; name: string }): Friend => ({
  id: u.id,
  label: u.name,
  name: u.name,
});

const tripToTripState = (trip: TripEntry): TripState => {
  const friends: Friend[] = (trip.friends ?? []).map(userToFriend);
  const organizer: Friend[] = (trip.organizers ?? []).map(userToFriend);

  let destinations: Destination[];
  if (isSingle(trip)) {
    destinations = [
      {
        id: trip.id,
        country: trip.country,
        flightInfo: trip.flightInfo,
        itinerary: trip.intenaryDates.map((d) => ({
          id: d.id,
          date: d.date,
          activities: d.activities,
        })),
      },
    ];
  } else {
    const legs = trip.intenaryDates;
    destinations = legs.map((d, i) => {
      const nextDate = legs[i + 1]?.date;
      const endDate = nextDate
        ? moment(nextDate).subtract(1, "day").format("YYYY-MM-DD")
        : trip.endDate;
      return {
        id: d.id,
        country: d.country,
        flightInfo: d.flightInfo,
        startDate: d.date,
        endDate,
        itinerary: [
          {
            id: d.id,
            date: d.date,
            activities: d.activities,
          },
        ],
      };
    });
  }

  return {
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: trip.status,
    type: trip.interaryType
      ? {
          id: trip.interaryType.id,
          name: trip.interaryType.name,
          route: "",
          steps: { BASIC: 0, FRIEND: 0, FINISH: 0 },
        }
      : undefined,
    budget: trip.budget,
    total: trip.budget,
    destinations,
    organizer,
    friends,
  };
};

export const TripDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useTripDispatch();
  const { user: currentUser } = useUser();
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : null;

  const trip = useMemo<TripEntry | undefined>(() => {
    if (id == null) return undefined;
    return (
      userIntinerary.singleDestinations.find((t) => t.id === id) ??
      userIntinerary.multipleDestinations.find((t) => t.id === id)
    );
  }, [id]);

  const baseTripData = useMemo(
    () => (trip ? tripToTripState(trip) : null),
    [trip],
  );

  const [statusOverride, setStatusOverride] = useState<TripStatus | null>(null);

  const tripData = useMemo<TripState | null>(() => {
    if (!baseTripData) return null;
    return statusOverride
      ? { ...baseTripData, status: statusOverride }
      : baseTripData;
  }, [baseTripData, statusOverride]);

  const isOrganizer = useMemo(() => {
    if (!trip || !currentUser?.email) return false;
    return trip.organizers.some(
      (o) => o.email?.toLowerCase() === currentUser.email?.toLowerCase(),
    );
  }, [trip, currentUser]);

  const isLocked = !!(
    trip?.status?.name && LOCKED_STATUS_NAMES.has(trip.status.name)
  );

  const isViewMode = !isOrganizer || isLocked;

  const canExport = isLocked;

  const handleChangeStep = () => {
    if (!tripData || !trip) return;
    dispatch(basicInfo(tripData));
    const route =
      trip.interaryType?.id === TRIP_BASIC.MULTIPLE.id
        ? TRIP_BASIC.MULTIPLE.route
        : TRIP_BASIC.SINGLE.route;
    navigate(route);
  };

  const handleExportExcel = () => {
    if (!tripData) return;
    void exportTripToExcel(tripData);
  };

  if (!trip || !tripData) {
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
