import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import AirlineLogo from 'components/common/AirlineLogo';
import './index.scss';

export interface FlightDepartureRowProps {
    item: FlightDepartureOption;
    onPick: (item: FlightDepartureOption) => void;
}

/** One departures result. The whole card is a single clickable button —
 *  tapping anywhere picks the flight (the green "Use" pill on the right
 *  is just the affordance, not a separate control). Kept as its own
 *  component so the list map in FlightDeparturesSearch stays readable. */
const FlightDepartureRow = ({ item, onPick }: FlightDepartureRowProps) => {
    const arrival = [item.arrivalAirport, item.arrivalAirportName]
        .filter(Boolean)
        .join(' ');
    const route = [item.departAirport, arrival].filter(Boolean).join(' → ');
    const times = [item.departTime, item.arrivalTime].filter(Boolean).join(' → ');

    return (
        <li className="flight-departure-row" role="listitem">
            <button
                type="button"
                className="flight-departure-row-btn"
                onClick={() => onPick(item)}
                aria-label={`Use flight ${item.flightNumber ?? ''} ${route}`.trim()}
            >
                <AirlineLogo
                    iata={item.airlineIata}
                    flightNumber={item.flightNumber}
                    label={item.airline}
                />
                <span className="flight-departure-row-info">
                    <span className="flight-departure-row-head">
                        <span className="flight-departure-row-number">
                            {item.flightNumber ?? '—'}
                        </span>
                        {item.airline && (
                            <span className="flight-departure-row-airline">
                                {item.airline}
                            </span>
                        )}
                    </span>
                    {route && (
                        <span className="flight-departure-row-route">{route}</span>
                    )}
                    <span className="flight-departure-row-meta">
                        {times && (
                            <span className="flight-departure-row-times">
                                {times}
                            </span>
                        )}
                        {item.aircraft && (
                            <span className="flight-departure-row-aircraft">
                                {item.aircraft}
                            </span>
                        )}
                    </span>
                </span>
                <span className="flight-departure-row-cta">Use</span>
            </button>
        </li>
    );
};

export default FlightDepartureRow;
