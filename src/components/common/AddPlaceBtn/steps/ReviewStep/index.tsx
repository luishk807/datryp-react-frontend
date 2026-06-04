import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { CircularProgress } from '@mui/material';
import { ACTIVITY_KIND } from 'constants';
import type { ActivityKind } from 'types';
import type { PlaceDraft } from '../../types';
import './index.scss';

export interface ReviewStepProps {
    place: PlaceDraft;
    /** Headline name derived the same way the submit helper derives it —
     *  so the review matches exactly what the timeline card will show. */
    derivedName: string;
    /** True while a PLACE smart entry is still resolving (location / cost /
     *  time + corrected name). Surfaces an inline "finishing up" cue; the
     *  ADD button (in WizardNav) is disabled in the same window. */
    resolving?: boolean;
}

const KIND_META: Record<
    ActivityKind,
    { label: string; Icon: typeof PlaceRoundedIcon }
> = {
    [ACTIVITY_KIND.PLACE]: { label: 'Place', Icon: PlaceRoundedIcon },
    [ACTIVITY_KIND.NOTE]: { label: 'Note', Icon: StickyNote2RoundedIcon },
    [ACTIVITY_KIND.FLIGHT]: { label: 'Flight', Icon: FlightRoundedIcon },
    [ACTIVITY_KIND.HOTEL_CHECKIN]: {
        label: 'Hotel check-in',
        Icon: HotelRoundedIcon,
    },
    [ACTIVITY_KIND.HOTEL_CHECKOUT]: {
        label: 'Hotel check-out',
        Icon: HotelRoundedIcon,
    },
    [ACTIVITY_KIND.TRAIN]: {
        label: 'Train',
        Icon: DirectionsTransitRoundedIcon,
    },
    [ACTIVITY_KIND.BUS]: { label: 'Bus', Icon: DirectionsBusRoundedIcon },
    [ACTIVITY_KIND.RENTAL_CAR]: {
        label: 'Rental car',
        Icon: CarRentalRoundedIcon,
    },
    [ACTIVITY_KIND.OTHER]: {
        label: 'Ride',
        Icon: LocalTaxiRoundedIcon,
    },
};

const timeWindow = (start?: string, end?: string): string | null => {
    if (start && end && start !== end) return `${start} – ${end}`;
    return start || end || null;
};

/** Step 3 of the Add-Activity wizard — a read-only summary of the
 *  assembled activity. Tweaks happen via Back, not here. */
const ReviewStep = ({ place, derivedName, resolving = false }: ReviewStepProps) => {
    const kind = place.kind ?? ACTIVITY_KIND.PLACE;
    const { label, Icon } = KIND_META[kind] ?? KIND_META[ACTIVITY_KIND.PLACE];

    const isFlight = kind === ACTIVITY_KIND.FLIGHT;
    const isTransit =
        kind === ACTIVITY_KIND.TRAIN ||
        kind === ACTIVITY_KIND.BUS ||
        kind === ACTIVITY_KIND.RENTAL_CAR ||
        kind === ACTIVITY_KIND.OTHER;

    const time = isFlight
        ? timeWindow(
              place.flightSegments?.[0]?.departTime,
              place.flightSegments?.[place.flightSegments.length - 1]
                  ?.arrivalTime,
          )
        : isTransit
          ? timeWindow(
                place.transitSegments?.[0]?.departTime,
                place.transitSegments?.[place.transitSegments.length - 1]
                    ?.arrivalTime,
            )
          : timeWindow(place.startTime, place.endTime);

    const flightRoute = isFlight
        ? [
              place.flightSegments?.[0]?.departAirport,
              ...(place.flightSegments ?? []).map((s) => s.arrivalAirport),
          ]
              .filter((s) => s && s.trim())
              .join(' → ')
        : '';
    const transitRoute = isTransit
        ? [
              place.transitSegments?.[0]?.departStation,
              ...(place.transitSegments ?? []).map((s) => s.arrivalStation),
          ]
              .filter((s) => s && s.trim())
              .join(' → ')
        : '';

    const locationLine = isFlight
        ? flightRoute
        : isTransit
          ? transitRoute
          : place.location ?? '';

    const costNum = place.cost != null && String(place.cost).trim();

    return (
        <div className="add-wizard-step add-review-step">
            <h2 className="add-wizard-headline">Ready to add?</h2>
            <p className="add-wizard-sub">
                Quick check — use Back to tweak anything.
            </p>
            {resolving && (
                <div className="add-review-resolving">
                    <CircularProgress
                        size={16}
                        className="add-review-resolving-spinner"
                    />
                    <span>Still finishing up the details…</span>
                </div>
            )}
            <div className="add-review-card">
                <div className="add-review-card-head">
                    {place.image?.url ? (
                        <img
                            className="add-review-card-thumb"
                            src={place.image.url}
                            alt={derivedName || label}
                        />
                    ) : (
                        <span className="add-review-card-kind-icon">
                            <Icon fontSize="small" />
                        </span>
                    )}
                    <div className="add-review-card-titles">
                        <span className="add-review-card-name">
                            {derivedName || 'Untitled activity'}
                        </span>
                        <span className="add-review-card-kind">{label}</span>
                    </div>
                </div>
                <div className="add-review-card-rows">
                    {locationLine && (
                        <div className="add-review-row">
                            <PlaceOutlinedIcon className="add-review-row-icon" />
                            <span>{locationLine}</span>
                        </div>
                    )}
                    {time && (
                        <div className="add-review-row">
                            <ScheduleRoundedIcon className="add-review-row-icon" />
                            <span>{time}</span>
                        </div>
                    )}
                    {costNum && (
                        <div className="add-review-row">
                            <PaymentsRoundedIcon className="add-review-row-icon" />
                            <span>{costNum}</span>
                        </div>
                    )}
                    {kind === ACTIVITY_KIND.NOTE && place.note?.trim() && (
                        <div className="add-review-row add-review-row-note">
                            <StickyNote2RoundedIcon className="add-review-row-icon" />
                            <span>{place.note.trim()}</span>
                        </div>
                    )}
                    {place.confirmationNumber?.trim() && (
                        <div className="add-review-row">
                            <span className="add-review-row-label">
                                Confirmation #
                            </span>
                            <span>{place.confirmationNumber.trim()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewStep;
