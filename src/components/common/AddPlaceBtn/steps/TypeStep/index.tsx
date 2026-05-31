import classNames from 'classnames';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import CommuteRoundedIcon from '@mui/icons-material/CommuteRounded';
import { ACTIVITY_KIND } from 'constants';
import type { ActivityKind } from 'types';
import './index.scss';

export interface TypeStepProps {
    /** The currently-selected kind, so the tile reflects a return-visit
     *  via Back. */
    currentKind: ActivityKind;
    /** Picks a kind and advances to the method step. The value maps to
     *  the existing kind-toggle entries (Hotel → HOTEL_CHECKIN, Ground →
     *  TRAIN); the per-form sub-toggles handle the rest. */
    onPick: (kind: ActivityKind) => void;
}

const TILES: {
    value: ActivityKind;
    label: string;
    sub: string;
    Icon: typeof PlaceRoundedIcon;
    activeKinds: ActivityKind[];
}[] = [
    {
        value: ACTIVITY_KIND.PLACE,
        label: 'Place',
        sub: 'A sight, meal, or activity.',
        Icon: PlaceRoundedIcon,
        activeKinds: [ACTIVITY_KIND.PLACE],
    },
    {
        value: ACTIVITY_KIND.NOTE,
        label: 'Note',
        sub: 'A free-form reminder.',
        Icon: StickyNote2RoundedIcon,
        activeKinds: [ACTIVITY_KIND.NOTE],
    },
    {
        value: ACTIVITY_KIND.FLIGHT,
        label: 'Flight',
        sub: 'Depart & arrival legs.',
        Icon: FlightRoundedIcon,
        activeKinds: [ACTIVITY_KIND.FLIGHT],
    },
    {
        value: ACTIVITY_KIND.HOTEL_CHECKIN,
        label: 'Hotel',
        sub: 'Check-in / check-out.',
        Icon: HotelRoundedIcon,
        activeKinds: [
            ACTIVITY_KIND.HOTEL_CHECKIN,
            ACTIVITY_KIND.HOTEL_CHECKOUT,
        ],
    },
    {
        value: ACTIVITY_KIND.TRAIN,
        label: 'Transport',
        sub: 'Train, bus, or rental car.',
        Icon: CommuteRoundedIcon,
        activeKinds: [
            ACTIVITY_KIND.TRAIN,
            ACTIVITY_KIND.BUS,
            ACTIVITY_KIND.RENTAL_CAR,
        ],
    },
];

/** Step 1 of the Add-Activity wizard — pick what type of activity this
 *  is. One tap advances to the method step. */
const TypeStep = ({ currentKind, onPick }: TypeStepProps) => (
    <div className="add-wizard-step add-type-step">
        <h2 className="add-wizard-headline">What would you like to add?</h2>
        <p className="add-wizard-sub">Pick a type to get started.</p>
        <div className="add-type-tiles" role="list">
            {TILES.map(({ value, label, sub, Icon, activeKinds }) => {
                const active = activeKinds.includes(currentKind);
                return (
                    <button
                        key={value}
                        type="button"
                        role="listitem"
                        className={classNames('add-type-tile', {
                            'is-selected': active,
                        })}
                        onClick={() => onPick(value)}
                    >
                        <Icon className="add-type-tile-icon" />
                        <span className="add-type-tile-title">{label}</span>
                        <span className="add-type-tile-sub">{sub}</span>
                    </button>
                );
            })}
        </div>
    </div>
);

export default TypeStep;
