import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import InputField from 'components/common/FormFields/InputField';
import type { TransitInfo } from 'types';
import {
    DateTimeField,
    toDateTime,
    transitOperatorLine,
    transitRoute,
    transitSchedule,
} from '../helpers';
import './index.scss';

export interface TransitFieldsProps {
    segments: TransitInfo[];
    isRental: boolean;
    /** Trip start — locks the depart picker so a leg can't be dated before
     *  the trip begins. The user widens it by editing the trip dates. */
    tripMinDate?: string;
    tripMaxDate?: string;
    isoDefaultDate: string;
    /** Transit-mode icon (train / bus / ferry / car) shown in each collapsed
     *  header meta line, mirroring the flight card's airline logo slot. */
    ModeIcon?: SvgIconComponent;
    onField: (idx: number, name: keyof TransitInfo, value: string) => void;
    onAddLeg: () => void;
    onRemoveLeg: (idx: number) => void;
    /** Optional per-segment content rendered at the TOP of an open segment
     *  body, before the operator field. The activity form uses it to mount
     *  its schedule-lookup watcher + loading / "couldn't find" hint; the
     *  destination passes nothing. */
    renderSegmentExtra?: (segIdx: number, open: boolean) => ReactNode;
    /** Label for the add-leg button — "Add leg (transfer)" for transit,
     *  "Add stopover" for rental. Defaults to "Add leg". */
    addLegLabel?: string;
    /** Show the add-leg button. The destination editor is single-leg, so it
     *  hides it (kept pixel-identical to the old single-segment card).
     *  Defaults to true. */
    showAddLeg?: boolean;
}

/** Editable transit fields as collapsible segment cards, visually identical
 *  to `FlightFields` legs: a rich collapsed header (Segment N · FROM → TO over
 *  a muted provider/number · schedule line) that expands to the detail fields.
 *  Labels re-map for rental cars, and the collapsed meta line reads sensibly
 *  for train / bus / ferry / rental alike. All segments default collapsed so
 *  the compact summary is the resting state and the user expands to edit. */
const TransitFields = ({
    segments,
    isRental,
    tripMinDate,
    tripMaxDate,
    isoDefaultDate,
    ModeIcon,
    onField,
    onAddLeg,
    onRemoveLeg,
    renderSegmentExtra,
    addLegLabel,
    showAddLeg = true,
}: TransitFieldsProps) => {
    const { t } = useTranslation();
    const addLegText = addLegLabel ?? t('addForms.fields.addLeg');
    const [openSegments, setOpenSegments] = useState<Set<number>>(
        () => new Set(),
    );
    const prevLenRef = useRef(segments.length);
    useEffect(() => {
        if (segments.length > prevLenRef.current) {
            setOpenSegments((prev) => new Set(prev).add(segments.length - 1));
        }
        prevLenRef.current = segments.length;
    }, [segments.length]);

    const toggle = (idx: number) =>
        setOpenSegments((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });

    const labels = isRental
        ? {
              operator: t('addForms.fields.rental.operator'),
              number: t('addForms.fields.rental.number'),
              departStation: t('addForms.fields.rental.departStation'),
              arrivalStation: t('addForms.fields.rental.arrivalStation'),
              departDateTime: t('addForms.fields.rental.departDateTime'),
              arrivalDateTime: t('addForms.fields.rental.arrivalDateTime'),
              classOrSeat: t('addForms.fields.rental.classOrSeat'),
          }
        : {
              operator: t('addForms.fields.transit.operator'),
              number: t('addForms.fields.transit.number'),
              departStation: t('addForms.fields.transit.departStation'),
              arrivalStation: t('addForms.fields.transit.arrivalStation'),
              departDateTime: t('addForms.fields.transit.departDateTime'),
              arrivalDateTime: t('addForms.fields.transit.arrivalDateTime'),
              classOrSeat: t('addForms.fields.transit.classOrSeat'),
          };

    return (
        <>
            {segments.map((segment, idx) => {
                const open = openSegments.has(idx);
                const route = transitRoute(segment);
                const operatorLine = transitOperatorLine(segment);
                const schedule = transitSchedule(segment);
                return (
                    <div key={idx} className="add-destination-segment">
                        <div className="add-destination-segment-head">
                            <button
                                type="button"
                                className="add-destination-segment-toggle flight-segment-toggle"
                                onClick={() => toggle(idx)}
                                aria-expanded={open}
                            >
                                {open ? (
                                    <ExpandLessRoundedIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreRoundedIcon fontSize="small" />
                                )}
                                <span className="flight-segment-header">
                                    <span className="flight-segment-route">
                                        <span className="flight-segment-seg">
                                            {t('addForms.fields.segment', {
                                                n: idx + 1,
                                            })}
                                        </span>
                                        {route && (
                                            <span className="flight-segment-path">
                                                {route}
                                            </span>
                                        )}
                                    </span>
                                    {(operatorLine || schedule) && (
                                        <span className="flight-segment-meta">
                                            {operatorLine && (
                                                <span className="flight-segment-flight">
                                                    {ModeIcon && (
                                                        <ModeIcon className="transit-segment-mode" />
                                                    )}
                                                    {operatorLine}
                                                </span>
                                            )}
                                            {schedule && (
                                                <span className="flight-segment-schedule">
                                                    {schedule}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </span>
                            </button>
                            {segments.length > 1 && (
                                <button
                                    type="button"
                                    className="add-destination-segment-remove"
                                    aria-label={t(
                                        'addForms.fields.removeSegment',
                                        { n: idx + 1 },
                                    )}
                                    onClick={() => onRemoveLeg(idx)}
                                >
                                    <CloseRoundedIcon fontSize="small" />
                                </button>
                            )}
                        </div>
                        {open && (
                            <div className="add-destination-segment-body">
                                {renderSegmentExtra?.(idx, open)}
                                <div className="add-destination-field">
                                    <label className="add-destination-label">
                                        {labels.operator}
                                    </label>
                                    <InputField
                                        value={segment.operator ?? ''}
                                        name={`transitOperator-${idx}`}
                                        label=""
                                        required={!isRental}
                                        onChange={(e) =>
                                            onField(
                                                idx,
                                                'operator',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="add-destination-field">
                                    <label className="add-destination-label">
                                        {labels.number}
                                    </label>
                                    <InputField
                                        value={segment.number ?? ''}
                                        name={`transitNumber-${idx}`}
                                        label=""
                                        required={false}
                                        onChange={(e) =>
                                            onField(idx, 'number', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="add-destination-row">
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            {labels.departStation}
                                        </label>
                                        <InputField
                                            value={segment.departStation ?? ''}
                                            name={`transitDepartStation-${idx}`}
                                            label=""
                                            onChange={(e) =>
                                                onField(
                                                    idx,
                                                    'departStation',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            {labels.arrivalStation}
                                        </label>
                                        <InputField
                                            value={segment.arrivalStation ?? ''}
                                            name={`transitArrivalStation-${idx}`}
                                            label=""
                                            required={false}
                                            onChange={(e) =>
                                                onField(
                                                    idx,
                                                    'arrivalStation',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="add-destination-row">
                                    <DateTimeField
                                        label={labels.departDateTime}
                                        value={toDateTime(
                                            segment.departDate,
                                            segment.departTime,
                                        )}
                                        minDate={tripMinDate}
                                        maxDate={tripMaxDate}
                                        onChange={(date, time) => {
                                            onField(idx, 'departDate', date);
                                            onField(idx, 'departTime', time);
                                        }}
                                    />
                                    <DateTimeField
                                        label={labels.arrivalDateTime}
                                        value={toDateTime(
                                            segment.arrivalDate,
                                            segment.arrivalTime,
                                        )}
                                        minDate={
                                            segment.departDate || isoDefaultDate
                                        }
                                        maxDate={tripMaxDate}
                                        onChange={(date, time) => {
                                            onField(idx, 'arrivalDate', date);
                                            onField(idx, 'arrivalTime', time);
                                        }}
                                    />
                                </div>
                                <div className="add-destination-field">
                                    <label className="add-destination-label">
                                        {labels.classOrSeat}
                                    </label>
                                    <InputField
                                        value={segment.classOrSeat ?? ''}
                                        name={`transitClassOrSeat-${idx}`}
                                        label=""
                                        required={false}
                                        onChange={(e) =>
                                            onField(
                                                idx,
                                                'classOrSeat',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            {showAddLeg && (
                <button
                    type="button"
                    className="add-destination-add-leg"
                    onClick={onAddLeg}
                >
                    <AddRoundedIcon fontSize="small" />
                    {addLegText}
                </button>
            )}
        </>
    );
};

export default TransitFields;
