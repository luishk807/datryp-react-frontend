import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
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
        { metaKey: string; Icon: typeof AutoAwesomeRoundedIcon }
    >
> = {
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

/** Step 2 of the tile path — how to add the chosen transport. Mirrors the
 *  Add-Activity wizard's MethodStep, scoped to AddDestination styling. Only
 *  the methods that apply to the picked kind are rendered. */
const MethodStep = ({ methods, onPick }: MethodStepProps) => {
    const { t } = useTranslation();
    return (
        <section className="add-destination-group add-destination-method">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">
                    {t('addForms.transport.method.headline')}
                </h4>
            </header>
            <div className="add-destination-method-tiles" role="list">
                {methods.map((method) => {
                    const meta = META[method];
                    if (!meta) return null;
                    const { metaKey, Icon } = meta;
                    return (
                        <button
                            key={method}
                            type="button"
                            role="listitem"
                            className={classNames(
                                'add-destination-method-tile',
                            )}
                            onClick={() => onPick(method)}
                        >
                            <Icon className="add-destination-method-tile-icon" />
                            <span className="add-destination-method-tile-title">
                                {t(
                                    `addForms.transport.method.${metaKey}.label`,
                                )}
                            </span>
                            <span className="add-destination-method-tile-sub">
                                {t(`addForms.transport.method.${metaKey}.sub`)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default MethodStep;
