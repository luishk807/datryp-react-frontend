import type {
  Intinerary,
  IntenaryStatus,
  IntineraryType,
  MultipleDestinations,
  SingleDestination,
  User,
} from "types";

const me: User = {
  id: 1,
  name: "Luis",
  phone: "+1 555 123 4567",
  email: "luis@example.com",
  dob: "1990-05-20",
  countryOfBirth: {
    id: 1,
    name: "United States",
    code: "US",
  },
  preferredAirport: "JFK",
  gender: {
    id: 1,
    name: "Male",
  },
};

const joanna: User = {
  id: 2,
  name: "Joanna Tam",
  phone: "+1 555 234 5678",
  email: "joanna@example.com",
  dob: "1990-05-20",
  countryOfBirth: {
    id: 1,
    name: "United States",
    code: "US",
  },
  preferredAirport: "JFK",
  gender: {
    id: 1,
    name: "Male",
  },
};

const alberto: User = {
  id: 3,
  name: "Alberto Wesker",
  phone: "+1 555 345 6789",
  email: "alberto@example.com",
  dob: "1990-05-20",
  countryOfBirth: {
    id: 1,
    name: "United States",
    code: "US",
  },
  preferredAirport: "JFK",
  gender: {
    id: 1,
    name: "Male",
  },
};

const jessica: User = {
  id: 4,
  name: "Jessica Ruan",
  phone: "+1 555 456 7890",
  email: "jessica@example.com",
  dob: "1990-05-20",
  countryOfBirth: {
    id: 1,
    name: "United States",
    code: "US",
  },
  preferredAirport: "JFK",
  gender: {
    id: 1,
    name: "Male",
  },
};

const chris: User = {
  id: 5,
  name: "Chris Redfield",
  phone: "+1 555 567 8901",
  email: "chris@example.com",
  dob: "1990-05-20",
  countryOfBirth: {
    id: 1,
    name: "United States",
    code: "US",
  },
  preferredAirport: "JFK",
  gender: {
    id: 1,
    name: "Male",
  },
};

const leon: User = {
  id: 6,
  name: "Leon Kennedy",
  phone: "+1 555 678 9012",
  email: "leon@example.com",
  dob: "1990-05-20",
  countryOfBirth: {
    id: 1,
    name: "United States",
    code: "US",
  },
  preferredAirport: "JFK",
  gender: {
    id: 1,
    name: "Male",
  },
};

const singleTripType: IntineraryType = {
  id: 1,
  name: "Single Destination Trip",
};

const multiTripType: IntineraryType = {
  id: 2,
  name: "Multi Destination Trip",
};

const inteneraryType: IntineraryType[] = [singleTripType, multiTripType];

const statusPlanning: IntenaryStatus = { id: 1, name: "Planning" };
const statusConfirmed: IntenaryStatus = { id: 2, name: "Confirmed" };
const statusCompleted: IntenaryStatus = { id: 3, name: "Completed" };

const tokyoTrip: SingleDestination = {
  id: 101,
  name: "Tokyo Spring Getaway",
  startDate: "2026-04-05",
  endDate: "2026-04-12",
  status: statusPlanning,
  user: me,
  budget: 3500,
  friends: [joanna, jessica],
  organizers: [me],
  interaryType: singleTripType,
  country: {
    id: 392,
    name: "Japan",
    code: "JP",
    image: "/images/sample/japan.jpg",
  },
  flightInfo: {
    departDate: "2026-04-05",
    departTime: "10:30",
    arrivalDate: "2026-04-06",
    arrivalTime: "14:45",
    flightNumber: "NH9",
    departAirport: "JFK",
    arrivalAirport: "HND",
  },
  intenaryDates: [
    {
      id: 1,
      date: "2026-04-06",
      activities: [
        {
          id: 1,
          name: "Check-in at Shinjuku Hotel",
          place: "Park Hyatt Tokyo",
          location: "Shinjuku, Tokyo",
          startTime: "16:00",
          endTime: "17:00",
          cost: 0,
        },
        {
          id: 2,
          name: "Dinner at Omoide Yokocho",
          location: "Shinjuku, Tokyo",
          startTime: "19:00",
          endTime: "21:00",
          cost: 80,
          people: 3,
        },
      ],
    },
    {
      id: 2,
      date: "2026-04-07",
      activities: [
        {
          id: 3,
          name: "Senso-ji Temple",
          location: "Asakusa, Tokyo",
          startTime: "09:00",
          endTime: "11:00",
          image: { url: "/images/sample/japan2.jpg", name: "sensoji" },
        },
        {
          id: 4,
          name: "Akihabara Walk",
          location: "Akihabara, Tokyo",
          startTime: "14:00",
          endTime: "17:00",
          cost: 50,
        },
      ],
    },
  ],
};

const parisTrip: SingleDestination = {
  id: 102,
  name: "Paris Weekend",
  startDate: "2026-06-12",
  endDate: "2026-06-15",
  status: statusPlanning,
  user: me,
  budget: 2000,
  friends: [joanna],
  organizers: [me, joanna],
  interaryType: singleTripType,
  country: {
    id: 250,
    name: "France",
    code: "FR",
    image: "/images/sample/france.jpg",
  },
  flightInfo: {
    departDate: "2026-06-12",
    departTime: "21:00",
    arrivalDate: "2026-06-13",
    arrivalTime: "10:30",
    flightNumber: "AF23",
    departAirport: "JFK",
    arrivalAirport: "CDG",
  },
  intenaryDates: [
    {
      id: 1,
      date: "2026-06-13",
      activities: [
        {
          id: 1,
          name: "Eiffel Tower",
          location: "Champ de Mars, Paris",
          startTime: "11:00",
          endTime: "13:00",
          cost: 30,
        },
      ],
    },
  ],
};

const euroTour: MultipleDestinations = {
  id: 201,
  name: "Euro Summer Tour",
  startDate: "2026-07-01",
  endDate: "2026-07-21",
  status: statusConfirmed,
  user: me,
  budget: 8000,
  friends: [alberto, chris, leon],
  organizers: [me, joanna],
  interaryType: multiTripType,
  intenaryDates: [
    {
      id: 1,
      date: "2026-07-02",
      country: {
        id: 380,
        name: "Italy",
        code: "IT",
        image: "/images/sample/italy.jpg",
      },
      flightInfo: {
        departDate: "2026-07-01",
        departTime: "22:00",
        arrivalDate: "2026-07-02",
        arrivalTime: "12:00",
        flightNumber: "AZ611",
        departAirport: "JFK",
        arrivalAirport: "FCO",
      },
      activities: [
        {
          id: 1,
          name: "Colosseum Tour",
          location: "Rome",
          startTime: "10:00",
          endTime: "13:00",
          cost: 60,
          people: 5,
        },
      ],
    },
    {
      id: 2,
      date: "2026-07-08",
      country: {
        id: 250,
        name: "France",
        code: "FR",
        image: "/images/sample/france.jpg",
      },
      flightInfo: {
        departDate: "2026-07-08",
        departTime: "08:00",
        arrivalDate: "2026-07-08",
        arrivalTime: "10:00",
        flightNumber: "AF1305",
        departAirport: "FCO",
        arrivalAirport: "CDG",
      },
      activities: [
        {
          id: 1,
          name: "Louvre Museum",
          location: "Paris",
          startTime: "10:00",
          endTime: "14:00",
          cost: 25,
        },
      ],
    },
    {
      id: 3,
      date: "2026-07-15",
      country: {
        id: 724,
        name: "Spain",
        code: "ES",
        image: "/images/sample/spain.jpg",
      },
      flightInfo: {
        departDate: "2026-07-15",
        departTime: "09:00",
        arrivalDate: "2026-07-15",
        arrivalTime: "11:00",
        flightNumber: "IB3403",
        departAirport: "CDG",
        arrivalAirport: "MAD",
      },
      activities: [
        {
          id: 1,
          name: "Sagrada Familia",
          location: "Barcelona",
          startTime: "10:30",
          endTime: "12:30",
          cost: 40,
        },
      ],
    },
  ],
};

const asiaPastTour: MultipleDestinations = {
  id: 202,
  name: "Asia Discovery 2025",
  startDate: "2025-10-05",
  endDate: "2025-10-20",
  status: statusCompleted,
  user: me,
  budget: 6500,
  friends: [joanna, jessica],
  organizers: [me],
  interaryType: multiTripType,
  intenaryDates: [
    {
      id: 1,
      date: "2025-10-06",
      country: {
        id: 156,
        name: "China",
        code: "CN",
        image: "/images/sample/china1.jpg",
      },
      flightInfo: {
        departDate: "2025-10-05",
        departTime: "23:00",
        arrivalDate: "2025-10-06",
        arrivalTime: "16:00",
        flightNumber: "CA982",
        departAirport: "JFK",
        arrivalAirport: "PEK",
      },
      activities: [
        {
          id: 1,
          name: "Great Wall",
          location: "Beijing",
          startTime: "08:00",
          endTime: "15:00",
          cost: 70,
        },
      ],
    },
    {
      id: 2,
      date: "2025-10-14",
      country: {
        id: 410,
        name: "South Korea",
        code: "KR",
        image: "/images/sample/south-korea.jpg",
      },
      flightInfo: {
        departDate: "2025-10-14",
        departTime: "10:00",
        arrivalDate: "2025-10-14",
        arrivalTime: "13:00",
        flightNumber: "KE852",
        departAirport: "PEK",
        arrivalAirport: "ICN",
      },
      activities: [
        {
          id: 1,
          name: "Gyeongbokgung Palace",
          location: "Seoul",
          startTime: "09:00",
          endTime: "12:00",
          cost: 20,
        },
      ],
    },
  ],
};

export const userIntinerary: Intinerary = {
  singleDestinations: [tokyoTrip, parisTrip],
  multipleDestinations: [euroTour, asiaPastTour],
};
