import classNames from 'classnames';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import { ADD_METHOD } from 'constants';
import type { AddMethod } from 'types';
import './index.scss';

export interface MethodStepProps {
    /** Which methods apply to the chosen kind. The orchestrator computes
     *  this (FLIGHT → smart + find-my-flight + custom; TRAIN/BUS/RENTAL_CAR
     *  → smart + custom). SUGGESTIONS is place-only and never offered here. */
    methods: AddMethod[];
    onPick: (method: AddMethod) => void;
}

const META: Partial<
    Record<
        AddMethod,
        { label: string; sub: string; Icon: typeof AutoAwesomeRoundedIcon }
    >
> = {
    [ADD_METHOD.SMART]: {
        label: 'Smart search',
        sub: 'Type or paste — we fill in the rest.',
        Icon: AutoAwesomeRoundedIcon,
    },
    [ADD_METHOD.SEARCH]: {
        label: 'Find my flight',
        sub: "Search your airport's departures.",
        Icon: FlightTakeoffRoundedIcon,
    },
    [ADD_METHOD.CUSTOM]: {
        label: 'Custom',
        sub: 'Fill in the details yourself.',
        Icon: EditNoteRoundedIcon,
    },
};

/** Step 2 of the tile path — how to add the chosen transport. Mirrors the
 *  Add-Activity wizard's MethodStep, scoped to AddDestination styling. Only
 *  the methods that apply to the picked kind are rendered. */
const MethodStep = ({ methods, onPick }: MethodStepProps) => (
    <section className="add-destination-group add-destination-method">
        <header className="add-destination-group-head">
            <h4 className="add-destination-group-title">
                How would you like to add it?
            </h4>
        </header>
        <div className="add-destination-method-tiles" role="list">
            {methods.map((method) => {
                const meta = META[method];
                if (!meta) return null;
                const { label, sub, Icon } = meta;
                return (
                    <button
                        key={method}
                        type="button"
                        role="listitem"
                        className={classNames('add-destination-method-tile')}
                        onClick={() => onPick(method)}
                    >
                        <Icon className="add-destination-method-tile-icon" />
                        <span className="add-destination-method-tile-title">
                            {label}
                        </span>
                        <span className="add-destination-method-tile-sub">
                            {sub}
                        </span>
                    </button>
                );
            })}
        </div>
    </section>
);

export default MethodStep;
