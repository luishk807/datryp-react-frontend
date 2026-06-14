import { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@mui/material';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import InputField from 'components/common/FormFields/InputField';
import { ACTIVITY_KIND } from 'constants';
import type { TransportKind } from '../types';
import './index.scss';

/** Sentinel for the "I'll add later" tile — selects no transport (kind=null)
 *  and the Describe step collects a destination-only entry instead. */
export const LATER = 'later' as const;
export type TypePick = TransportKind | typeof LATER;

export interface TypeStepProps {
    /** The currently-selected kind, so a tile reflects a return-visit via the
     *  Describe step's "Change" link. `null` highlights the "later" tile only
     *  when the user explicitly chose it (tracked by the orchestrator). */
    currentKind: TransportKind | null;
    /** True when "I'll add later" is the active choice — distinguishes it from
     *  the initial unset state so its tile doesn't highlight before any pick. */
    laterActive: boolean;
    /** Picks a type and advances to the Describe step. */
    onPick: (value: TypePick) => void;
    /** ADD-only: submit the smart box. Detects the kind from the text and
     *  jumps to Confirm. When omitted (edit mode) the smart box + OR divider
     *  are hidden and only the tiles show. */
    onSmartSubmit?: (text: string) => void;
}

export const TYPE_CHIPS: {
    value: TypePick;
    tileKey: string;
    Icon: typeof FlightRoundedIcon;
}[] = [
    {
        value: ACTIVITY_KIND.FLIGHT,
        tileKey: 'flight',
        Icon: FlightRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.TRAIN,
        tileKey: 'train',
        Icon: DirectionsTransitRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.BUS,
        tileKey: 'bus',
        Icon: DirectionsBusRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.RENTAL_CAR,
        tileKey: 'rentalCar',
        Icon: CarRentalRoundedIcon,
    },
    {
        value: LATER,
        tileKey: 'later',
        Icon: BlockRoundedIcon,
    },
];

/** Step 1 — a smart box on top ("type the whole trip, we detect the type")
 *  with the transport-type tiles below as the manual alternative — mirroring
 *  the Add-Activity wizard's TypeStep. Smart submit jumps to Confirm; a tile
 *  click advances to the Describe step. */
const TypeStep = ({
    currentKind,
    laterActive,
    onPick,
    onSmartSubmit,
}: TypeStepProps) => {
    const { t } = useTranslation();
    const [smartText, setSmartText] = useState('');

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">
                    {t('addForms.transport.type.headline')}
                </h4>
            </header>

            {onSmartSubmit && (
                <>
                    <p className="type-step-sub">
                        {t('addForms.transport.type.sub')}
                    </p>
                    <form
                        className="type-smart"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const t = smartText.trim();
                            if (t) onSmartSubmit(t);
                        }}
                    >
                        <AutoAwesomeRoundedIcon className="type-smart-spark" />
                        <InputField
                            variant="bare"
                            name="dest-smart"
                            value={smartText}
                            required={false}
                            placeholder={t(
                                'addForms.transport.type.smartPlaceholder',
                            )}
                            onChange={(e) => setSmartText(e.target.value)}
                        />
                        <IconButton
                            type="submit"
                            className="type-smart-go"
                            aria-label={t('addForms.common.detectAndContinue')}
                            disabled={!smartText.trim()}
                        >
                            <ArrowForwardRoundedIcon fontSize="small" />
                        </IconButton>
                    </form>

                    <div className="type-or" role="separator">
                        <span>{t('addForms.common.or')}</span>
                    </div>
                </>
            )}

            <div
                className="transport-tiles"
                role="tablist"
                aria-label={t('addForms.transport.type.tilesAria')}
            >
                {TYPE_CHIPS.map(({ value, tileKey, Icon }) => {
                    const active =
                        value === LATER ? laterActive : currentKind === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={classNames('transport-tile', {
                                'is-active': active,
                            })}
                            onClick={() => onPick(value)}
                        >
                            <Icon className="transport-tile-icon" />
                            <span className="transport-tile-title">
                                {t(
                                    `addForms.transport.type.tiles.${tileKey}.label`,
                                )}
                            </span>
                            <span className="transport-tile-sub">
                                {t(
                                    `addForms.transport.type.tiles.${tileKey}.sub`,
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default TypeStep;
