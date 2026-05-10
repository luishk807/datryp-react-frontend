import type { Intinerary, User } from "types/trip.types";

const me: User = {
  id: 1,
  name: "Luis",
  phone: "+1 555 123 4567",
  email: "luis@example.com",
};

const joanna: User = {
  id: 2,
  name: "Joanna Tam",
  phone: "+1 555 234 5678",
  email: "joanna@example.com",
};

const alberto: User = {
  id: 3,
  name: "Alberto Wesker",
  phone: "+1 555 345 6789",
  email: "alberto@example.com",
};

const jessica: User = {
  id: 4,
  name: "Jessica Ruan",
  phone: "+1 555 456 7890",
  email: "jessica@example.com",
};

const chris: User = {
  id: 5,
  name: "Chris Redfield",
  phone: "+1 555 567 8901",
  email: "chris@example.com",
};

const leon: User = {
  id: 6,
  name: "Leon Kennedy",
  phone: "+1 555 678 9012",
  email: "leon@example.com",
};

export const userIntineraries: Intinerary[] = [
  // ---------- Trip 1: Iceland — single destination ----------
  {
    id: 1,
    name: "Iceland Getaway",
    startDate: "2026-03-15",
    endDate: "2026-03-22",
    status: { id: 2, name: "confirmed" },
    budget: 4500,
    user: me,
    organizers: [me],
    friends: [joanna, alberto, jessica],
    destinations: {
      singleDestinations: [
        {
          id: 1,
          intineraryType: { id: 1, name: "single" },
          date: "2026-03-15",
          country: {
            id: 1,
            name: "Iceland",
            code: "IS",
            image: "/images/sample/iceland.jpg",
          },
          flightInfo: {
            departDate: "2026-03-15",
            departTime: "08:30",
            arrivalDate: "2026-03-15",
            arrivalTime: "17:45",
            flightNumber: "IS204",
            departAirport: "JFK",
            arrivalAirport: "KEF",
          },
          intenaryDates: [
            {
              id: 1,
              date: "2026-03-15",
              activities: [
                {
                  id: 1,
                  place: "Blue Lagoon",
                  location: "Grindavik",
                  startTime: "14:00",
                  endTime: "17:00",
                  cost: 120,
                  note: "Geothermal spa",
                  status: { id: 1, name: "Confirmed" },
                },
              ],
            },
            {
              id: 2,
              date: "2026-03-16",
              activities: [
                {
                  id: 2,
                  place: "Hallgrimskirkja",
                  location: "Reykjavik",
                  startTime: "10:00",
                  endTime: "11:30",
                  cost: 0,
                  status: { id: 1, name: "Confirmed" },
                },
                {
                  id: 3,
                  place: "Northern Lights Tour",
                  location: "Reykjavik",
                  startTime: "21:00",
                  endTime: "01:00",
                  cost: 95,
                  status: { id: 1, name: "Confirmed" },
                },
              ],
            },
            {
              id: 3,
              date: "2026-03-18",
              activities: [
                {
                  id: 4,
                  place: "Golden Circle Tour",
                  location: "Thingvellir",
                  startTime: "09:00",
                  endTime: "18:00",
                  cost: 180,
                  status: { id: 1, name: "Confirmed" },
                },
              ],
            },
          ],
        },
      ],
      multipleDestinations: [],
    },
  },

  // ---------- Trip 2: Vietnam — multi-destination ----------
  {
    id: 2,
    name: "Vietnam Adventure",
    startDate: "2026-06-10",
    endDate: "2026-06-20",
    status: { id: 1, name: "planning" },
    budget: 3200,
    image: "/images/sample/vietnam.jpg",
    user: me,
    organizers: [me, joanna],
    friends: [joanna],
    destinations: {
      singleDestinations: [],
      multipleDestinations: [
        {
          id: 1,
          intineraryType: { id: 2, name: "multiple" },
          date: "2026-06-10",
          intenaryDates: [
            {
              id: 1,
              date: "2026-06-11",
              country: { id: 2, name: "Vietnam", code: "VN" },
              flightInfo: {
                departDate: "2026-06-10",
                departTime: "06:00",
                arrivalDate: "2026-06-11",
                arrivalTime: "12:30",
                flightNumber: "VN23",
                departAirport: "LAX",
                arrivalAirport: "HAN",
              },
              activities: [
                {
                  id: 1,
                  place: "Hoan Kiem Lake",
                  location: "Hanoi",
                  startTime: "16:00",
                  endTime: "18:00",
                  cost: 0,
                  status: { id: 1, name: "Confirmed" },
                },
                {
                  id: 2,
                  place: "Old Quarter Walking Tour",
                  location: "Hanoi",
                  startTime: "19:30",
                  endTime: "22:00",
                  cost: 35,
                  status: { id: 2, name: "Pending" },
                },
              ],
            },
            {
              id: 2,
              date: "2026-06-15",
              country: { id: 2, name: "Vietnam", code: "VN" },
              flightInfo: {
                departDate: "2026-06-15",
                departTime: "08:00",
                arrivalDate: "2026-06-15",
                arrivalTime: "10:30",
                flightNumber: "VN101",
                departAirport: "HAN",
                arrivalAirport: "DAD",
              },
              activities: [
                {
                  id: 3,
                  place: "Halong Bay Cruise",
                  location: "Halong Bay",
                  startTime: "13:00",
                  endTime: "18:00",
                  cost: 220,
                  status: { id: 2, name: "Pending" },
                },
              ],
            },
            {
              id: 3,
              date: "2026-06-18",
              country: { id: 2, name: "Vietnam", code: "VN" },
              flightInfo: {
                departDate: "2026-06-18",
                departTime: "11:00",
                arrivalDate: "2026-06-18",
                arrivalTime: "12:30",
                flightNumber: "VN202",
                departAirport: "DAD",
                arrivalAirport: "SGN",
              },
              activities: [
                {
                  id: 4,
                  place: "Cu Chi Tunnels",
                  location: "Ho Chi Minh City",
                  startTime: "14:00",
                  endTime: "18:00",
                  cost: 60,
                  status: { id: 2, name: "Pending" },
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // ---------- Trip 3: China — single destination, completed ----------
  {
    id: 3,
    name: "China Tour",
    startDate: "2025-11-01",
    endDate: "2025-11-12",
    status: { id: 3, name: "completed" },
    budget: 5800,
    image: "/images/sample/china1.jpg",
    user: me,
    organizers: [me],
    friends: [joanna, alberto, jessica, chris, leon],
    destinations: {
      singleDestinations: [
        {
          id: 1,
          intineraryType: { id: 1, name: "single" },
          date: "2025-11-01",
          country: {
            id: 3,
            name: "China",
            code: "CN",
            image: "/images/sample/china1.jpg",
          },
          flightInfo: {
            departDate: "2025-11-01",
            departTime: "23:30",
            arrivalDate: "2025-11-03",
            arrivalTime: "05:15",
            flightNumber: "CA988",
            departAirport: "SFO",
            arrivalAirport: "PEK",
          },
          intenaryDates: [
            {
              id: 1,
              date: "2025-11-03",
              activities: [
                {
                  id: 1,
                  place: "Great Wall of China",
                  location: "Badaling",
                  startTime: "08:00",
                  endTime: "14:00",
                  cost: 65,
                  status: { id: 1, name: "Confirmed" },
                },
              ],
            },
            {
              id: 2,
              date: "2025-11-04",
              activities: [
                {
                  id: 2,
                  place: "Forbidden City",
                  location: "Beijing",
                  startTime: "09:30",
                  endTime: "13:00",
                  cost: 30,
                  status: { id: 1, name: "Confirmed" },
                },
                {
                  id: 3,
                  place: "Wangfujing Snack Street",
                  location: "Beijing",
                  startTime: "18:00",
                  endTime: "20:30",
                  cost: 25,
                  status: { id: 1, name: "Confirmed" },
                },
              ],
            },
            {
              id: 3,
              date: "2025-11-06",
              activities: [
                {
                  id: 4,
                  place: "Summer Palace",
                  location: "Beijing",
                  startTime: "10:00",
                  endTime: "15:00",
                  cost: 28,
                  status: { id: 1, name: "Confirmed" },
                },
              ],
            },
          ],
        },
      ],
      multipleDestinations: [],
    },
  },
];
