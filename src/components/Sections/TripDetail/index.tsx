import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import "./index.css";
import { Grid } from "@mui/material";
import Layout from "components/common/Layout/SubLayout";
import BasicTripInfo from "components/BasicTripInfo";
import BudgetSummary from "components/BudgetSummary";
import DestinationDetail from "components/DestinationDetail";
import { userTrips, type UserTripSummary } from "sample/userTrips";
import type { Friend, TripState } from "types/trip.types";

const summaryToTripState = (s: UserTripSummary): TripState => {
  const parts = s.destination.split(",").map((p) => p.trim());
  const country = parts[parts.length - 1] || parts[0] || "";

  const friends: Friend[] = Array.from({ length: s.friendsCount }, (_, i) => ({
    id: i + 1,
    label: `Traveler ${i + 1}`,
  }));

  return {
    name: s.name,
    startDate: s.startDate,
    endDate: s.endDate,
    status: { id: 0, name: s.status },
    budget: 0,
    total: 0,
    destinations: [
      {
        id: 0,
        country: { id: 0, name: country },
        startDate: s.startDate,
        endDate: s.endDate,
        itinerary: [],
      },
    ],
    organizer: [],
    friends,
  };
};

export const TripDetail = () => {
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : null;

  const trip = useMemo(
    () => (id != null ? userTrips.find((t) => t.id === id) : undefined),
    [id],
  );

  const tripData = useMemo(
    () => (trip ? summaryToTripState(trip) : null),
    [trip],
  );

  const handleChangeStep = () => {};

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
            isViewMode={true}
            data={tripData}
            onChangeStep={handleChangeStep}
          />
        </Grid>
        <Grid item lg={12} md={12} xs={12}>
          <BudgetSummary data={tripData} />
        </Grid>
        <Grid item lg={12}>
          <DestinationDetail
            type={tripData.type}
            isViewMode={true}
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
