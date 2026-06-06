import { useState } from 'react';
import classNames from 'classnames';
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

const SMART_PLACEHOLDER = 'EWR to Panama City June 6 on Copa for $450';

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
    label: string;
    sub: string;
    Icon: typeof FlightRoundedIcon;
}[] = [
    {
        value: ACTIVITY_KIND.FLIGHT,
        label: 'Flight',
        sub: 'Fly to your destination.',
        Icon: FlightRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.TRAIN,
        label: 'Train',
        sub: 'Rail journey.',
        Icon: DirectionsTransitRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.BUS,
        label: 'Bus',
        sub: 'Coach or intercity.',
        Icon: DirectionsBusRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.RENTAL_CAR,
        label: 'Rental Car',
        sub: 'Pick up a car.',
        Icon: CarRentalRoundedIcon,
    },
    {
        value: LATER,
        label: "I'll add later",
        sub: 'Decide this later.',
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
    const [smartText, setSmartText] = useState('');

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">Where to?</h4>
            </header>

            {onSmartSubmit && (
                <>
                    <p className="type-step-sub">
                        Type what you&rsquo;re adding and we&rsquo;ll figure out
                        the rest — or pick a type below.
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
                            placeholder={SMART_PLACEHOLDER}
                            onChange={(e) => setSmartText(e.target.value)}
                        />
                        <IconButton
                            type="submit"
                            className="type-smart-go"
                            aria-label="Detect and continue"
                            disabled={!smartText.trim()}
                        >
                            <ArrowForwardRoundedIcon fontSize="small" />
                        </IconButton>
                    </form>

                    <div className="type-or" role="separator">
                        <span>OR</span>
                    </div>
                </>
            )}

            <div
                className="transport-tiles"
                role="tablist"
                aria-label="Transport type"
            >
                {TYPE_CHIPS.map(({ value, label, sub, Icon }) => {
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
                            <span className="transport-tile-title">{label}</span>
                            <span className="transport-tile-sub">{sub}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default TypeStep;
