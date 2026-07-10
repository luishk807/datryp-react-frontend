/** Wire-shape fixtures for `GET /flights/departures`. The raw snake_case type
 *  isn't exported from the module, so we pin the wire shape locally here. */
export interface FlightDepartureWire {
    flight_number: string | null;
    airline: string | null;
    airline_iata: string | null;
    depart_airport: string | null;
    depart_date: string | null;
    depart_time: string | null;
    arrival_airport: string | null;
    arrival_airport_name: string | null;
    arrival_date: string | null;
    arrival_time: string | null;
    aircraft: string | null;
}

export interface FlightDeparturesWire {
    items: FlightDepartureWire[];
}

export const flightDepartureFixture: FlightDepartureWire = {
    flight_number: 'CM806',
    airline: 'Copa Airlines',
    airline_iata: 'CM',
    depart_airport: 'EWR',
    depart_date: '2026-08-01',
    depart_time: '08:15',
    arrival_airport: 'PTY',
    arrival_airport_name: 'Tocumen Intl',
    arrival_date: '2026-08-01',
    arrival_time: '13:40',
    aircraft: 'Boeing 737-800',
};

export const flightDeparturesFixture: FlightDeparturesWire = {
    items: [
        flightDepartureFixture,
        {
            flight_number: null,
            airline: null,
            airline_iata: null,
            depart_airport: 'EWR',
            depart_date: '2026-08-01',
            depart_time: null,
            arrival_airport: null,
            arrival_airport_name: null,
            arrival_date: null,
            arrival_time: null,
            aircraft: null,
        },
    ],
};

export const flightDeparturesEmptyFixture: FlightDeparturesWire = { items: [] };
