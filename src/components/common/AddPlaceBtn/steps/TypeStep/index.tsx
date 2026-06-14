import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import CommuteRoundedIcon from '@mui/icons-material/CommuteRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { ACTIVITY_KIND, BUTTON_VARIANT } from 'constants';
import { classifyActivityKind } from '../../classifyActivityKind';
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
    /** Smart-box submit: the free text the user typed plus the kind we
     *  detected for it. The wizard seeds that kind's smart-entry pipeline
     *  and jumps to the review. */
    onSmartSubmit: (text: string, kind: ActivityKind) => void;
}

const TILES: {
    value: ActivityKind;
    tileKey: string;
    Icon: typeof PlaceRoundedIcon;
    activeKinds: ActivityKind[];
}[] = [
    {
        value: ACTIVITY_KIND.PLACE,
        tileKey: 'place',
        Icon: PlaceRoundedIcon,
        activeKinds: [ACTIVITY_KIND.PLACE],
    },
    {
        value: ACTIVITY_KIND.NOTE,
        tileKey: 'note',
        Icon: StickyNote2RoundedIcon,
        activeKinds: [ACTIVITY_KIND.NOTE],
    },
    {
        value: ACTIVITY_KIND.FLIGHT,
        tileKey: 'flight',
        Icon: FlightRoundedIcon,
        activeKinds: [ACTIVITY_KIND.FLIGHT],
    },
    {
        value: ACTIVITY_KIND.HOTEL_CHECKIN,
        tileKey: 'hotel',
        Icon: HotelRoundedIcon,
        activeKinds: [
            ACTIVITY_KIND.HOTEL_CHECKIN,
            ACTIVITY_KIND.HOTEL_CHECKOUT,
        ],
    },
    {
        value: ACTIVITY_KIND.TRAIN,
        tileKey: 'transport',
        Icon: CommuteRoundedIcon,
        activeKinds: [
            ACTIVITY_KIND.TRAIN,
            ACTIVITY_KIND.BUS,
            ACTIVITY_KIND.RENTAL_CAR,
            ACTIVITY_KIND.OTHER,
        ],
    },
];

/** Step 1 of the Add-Activity wizard — type what you're adding in the
 *  smart box (we detect the kind), OR pick a type tile to fill it the
 *  classic way. */
const TypeStep = ({ currentKind, onPick, onSmartSubmit }: TypeStepProps) => {
    const { t } = useTranslation();
    const [smartText, setSmartText] = useState('');
    const [debounced, setDebounced] = useState('');
    // When set, the user clicked "change" — they pick a kind for the
    // typed text from a tiny inline override picker instead of the
    // detected one.
    const [overriding, setOverriding] = useState(false);

    // Debounce the classification so it doesn't run on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(smartText), 250);
        return () => clearTimeout(timer);
    }, [smartText]);

    const detected = useMemo(
        () => classifyActivityKind(debounced),
        [debounced],
    );

    // Translated label for the "Detected: …" chip, mapped from the guessed
    // kind so we don't surface the classifier's English `label` directly.
    const detectedLabel = (kind: ActivityKind): string => {
        switch (kind) {
            case ACTIVITY_KIND.FLIGHT:
                return t('addForms.activity.review.kind.flight');
            case ACTIVITY_KIND.TRAIN:
                return t('addForms.activity.review.kind.train');
            case ACTIVITY_KIND.BUS:
                return t('addForms.activity.review.kind.bus');
            case ACTIVITY_KIND.RENTAL_CAR:
                return t('addForms.activity.review.kind.rentalCar');
            case ACTIVITY_KIND.OTHER:
                return t('addForms.activity.review.kind.ride');
            case ACTIVITY_KIND.HOTEL_CHECKIN:
            case ACTIVITY_KIND.HOTEL_CHECKOUT:
                return t('addForms.activity.type.tiles.hotel.label');
            default:
                return t('addForms.activity.review.kind.place');
        }
    };

    const submit = (kind: ActivityKind) => {
        const text = smartText.trim();
        if (!text) return;
        onSmartSubmit(text, kind);
    };

    const handleSmartSubmit = () => {
        if (!detected) return;
        submit(detected.kind);
    };

    return (
        <div className="add-wizard-step add-type-step">
            <h2 className="add-wizard-headline">
                {t('addForms.activity.type.headline')}
            </h2>
            <p className="add-wizard-sub">
                {t('addForms.activity.type.sub')}
            </p>

            <div className="add-smart-box">
                {/* A real form so Enter submits natively — predictable,
                    no per-keystroke routing. */}
                <form
                    className="add-smart-box-field"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSmartSubmit();
                    }}
                >
                    <AutoAwesomeRoundedIcon className="add-smart-box-spark" />
                    <InputField
                        variant="bare"
                        name="add-smart-box"
                        value={smartText}
                        required={false}
                        placeholder={t('addForms.activity.type.smartPlaceholder')}
                        onChange={(e) => {
                            setSmartText(e.target.value);
                            setOverriding(false);
                        }}
                    />
                    <IconButton
                        type="submit"
                        className="add-smart-box-go"
                        aria-label={t('addForms.common.detectAndContinue')}
                        disabled={!detected}
                    >
                        <ArrowForwardRoundedIcon fontSize="small" />
                    </IconButton>
                </form>

                {detected && !overriding && (
                    <div className="add-smart-box-detected">
                        <span className="add-smart-box-detected-label">
                            {t('addForms.activity.type.detected')}{' '}
                            <strong>{detectedLabel(detected.kind)}</strong>
                        </span>
                        <button
                            type="button"
                            className="add-smart-box-change"
                            onClick={() => setOverriding(true)}
                        >
                            {t('addForms.common.change')}
                        </button>
                    </div>
                )}

                {detected && overriding && (
                    <div className="add-smart-box-override">
                        <span className="add-smart-box-override-label">
                            {t('addForms.activity.type.addAs')}
                        </span>
                        <div className="add-smart-box-override-options">
                            {TILES.filter(
                                (tile) => tile.value !== ACTIVITY_KIND.NOTE,
                            ).map(({ value, tileKey }) => (
                                <ButtonCustom
                                    key={value}
                                    label={t(
                                        `addForms.activity.type.tiles.${tileKey}.label`,
                                    )}
                                    type={BUTTON_VARIANT.LINE}
                                    onClick={() => submit(value)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="add-type-or" role="separator">
                <span>{t('addForms.common.or')}</span>
            </div>

            <div className="add-type-tiles" role="list">
                {TILES.map(({ value, tileKey, Icon, activeKinds }) => {
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
                            <span className="add-type-tile-title">
                                {t(
                                    `addForms.activity.type.tiles.${tileKey}.label`,
                                )}
                            </span>
                            <span className="add-type-tile-sub">
                                {t(
                                    `addForms.activity.type.tiles.${tileKey}.sub`,
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TypeStep;
