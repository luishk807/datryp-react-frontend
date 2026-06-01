import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import './index.scss';

export interface FlightDepartureRowProps {
    item: FlightDepartureOption;
    onPick: (item: FlightDepartureOption) => void;
}

/** One departures result. Tapping anywhere on the row (or the explicit
 *  "Use this flight" button) picks it. Kept as its own component so the
 *  list map in FlightDeparturesSearch stays readable. */
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
                className="flight-departure-row-main"
                onClick={() => onPick(item)}
            >
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
            </button>
            <ButtonCustom
                label="Use this flight"
                type={BUTTON_VARIANT.LINE}
                capitalizeType="none"
                className="flight-departure-row-pick"
                onClick={() => onPick(item)}
            />
        </li>
    );
};

export default FlightDepartureRow;
