export type UserTripStatus = "planning" | "confirmed" | "completed";

export interface UserTripSummary {
  id: number;
  name: string;
  destination: string;
  image: string;
  startDate: string;
  endDate: string;
  status: UserTripStatus;
  friendsCount: number;
}

export const userTrips: UserTripSummary[] = [
  {
    id: 1,
    name: "Iceland Getaway",
    destination: "Reykjavik, Iceland",
    image: "/images/sample/iceland.jpg",
    startDate: "2026-03-15",
    endDate: "2026-03-22",
    status: "confirmed",
    friendsCount: 4,
  },
  {
    id: 2,
    name: "Vietnam Adventure",
    destination: "Hanoi, Vietnam",
    image: "/images/sample/vietnam.jpg",
    startDate: "2026-06-10",
    endDate: "2026-06-20",
    status: "planning",
    friendsCount: 2,
  },
  {
    id: 3,
    name: "China Tour",
    destination: "Beijing, China",
    image: "/images/sample/china1.jpg",
    startDate: "2025-11-01",
    endDate: "2025-11-12",
    status: "completed",
    friendsCount: 6,
  },
];
