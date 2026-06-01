import classNames from 'classnames';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import { ADD_METHOD } from 'constants';
import type { AddMethod } from 'types';
import './index.scss';

export interface MethodStepProps {
    /** Which methods apply to the chosen kind. The parent computes this
     *  (PLACE/HOTEL → all three; FLIGHT/TRANSPORT → smart + custom;
     *  NOTE → custom only, handled upstream by auto-skipping this step). */
    methods: AddMethod[];
    onPick: (method: AddMethod) => void;
}

const META: Record<
    AddMethod,
    { label: string; sub: string; Icon: typeof AutoAwesomeRoundedIcon }
> = {
    [ADD_METHOD.SUGGESTIONS]: {
        label: 'Suggestions',
        sub: 'Pick from ideas for your destination.',
        Icon: LightbulbRoundedIcon,
    },
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

/** Step 2 of the Add-Activity wizard — how to add it. Renders only the
 *  methods that apply to the chosen kind. */
const MethodStep = ({ methods, onPick }: MethodStepProps) => (
    <div className="add-wizard-step add-method-step">
        <h2 className="add-wizard-headline">How would you like to add it?</h2>
        <p className="add-wizard-sub">Choose a way to fill in the details.</p>
        <div className="add-method-tiles" role="list">
            {methods.map((method) => {
                const { label, sub, Icon } = META[method];
                return (
                    <button
                        key={method}
                        type="button"
                        role="listitem"
                        className={classNames('add-method-tile')}
                        onClick={() => onPick(method)}
                    >
                        <Icon className="add-method-tile-icon" />
                        <span className="add-method-tile-title">{label}</span>
                        <span className="add-method-tile-sub">{sub}</span>
                    </button>
                );
            })}
        </div>
    </div>
);

export default MethodStep;
