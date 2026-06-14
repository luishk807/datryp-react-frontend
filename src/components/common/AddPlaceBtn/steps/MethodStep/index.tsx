import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
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
    { metaKey: string; Icon: typeof AutoAwesomeRoundedIcon }
> = {
    [ADD_METHOD.SUGGESTIONS]: {
        metaKey: 'suggestions',
        Icon: LightbulbRoundedIcon,
    },
    [ADD_METHOD.SMART]: {
        metaKey: 'smart',
        Icon: AutoAwesomeRoundedIcon,
    },
    [ADD_METHOD.SEARCH]: {
        metaKey: 'search',
        Icon: FlightTakeoffRoundedIcon,
    },
    [ADD_METHOD.CUSTOM]: {
        metaKey: 'custom',
        Icon: EditNoteRoundedIcon,
    },
};

/** Step 2 of the Add-Activity wizard — how to add it. Renders only the
 *  methods that apply to the chosen kind. */
const MethodStep = ({ methods, onPick }: MethodStepProps) => {
    const { t } = useTranslation();
    return (
        <div className="add-wizard-step add-method-step">
            <h2 className="add-wizard-headline">
                {t('addForms.activity.method.headline')}
            </h2>
            <p className="add-wizard-sub">
                {t('addForms.activity.method.sub')}
            </p>
            <div className="add-method-tiles" role="list">
                {methods.map((method) => {
                    const { metaKey, Icon } = META[method];
                    return (
                        <button
                            key={method}
                            type="button"
                            role="listitem"
                            className={classNames('add-method-tile')}
                            onClick={() => onPick(method)}
                        >
                            <Icon className="add-method-tile-icon" />
                            <span className="add-method-tile-title">
                                {t(
                                    `addForms.activity.method.${metaKey}.label`,
                                )}
                            </span>
                            <span className="add-method-tile-sub">
                                {t(`addForms.activity.method.${metaKey}.sub`)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MethodStep;
