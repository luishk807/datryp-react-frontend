import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import {
    findTripConflicts,
    formatDate,
    now,
    previewDuplicate,
    startsInPast,
    type DuplicateTripRange,
} from 'utils';
import type { TripState } from 'types';

export interface DuplicateTripModalProps {
    /** The trip being copied. */
    data: TripState;
    /** Active trips (excluding this one) used to warn about overlapping dates. */
    otherTrips?: DuplicateTripRange[];
    /** Fires with the chosen new start date when the user confirms. The parent
     *  builds the copy, re-seeds TripContext, and navigates to the editor. */
    onConfirm: (newStartDate: string) => void;
}

const fmt = (d: string) => (d ? formatDate(d, 'MMM D, YYYY') : '—');

const DuplicateTripModal = forwardRef<ModalButtonHandle, DuplicateTripModalProps>(
    ({ data, otherTrips = [], onConfirm }, ref) => {
        const modalRef = useRef<ModalButtonHandle>(null);
        const [newStartDate, setNewStartDate] = useState<string>(now());

        useImperativeHandle(ref, () => ({
            openModel: () => {
                // Fresh default each open so a reopened modal doesn't keep a
                // stale picked date.
                setNewStartDate(now());
                modalRef.current?.openModel();
            },
            closeModal: () => modalRef.current?.closeModal(),
        }));

        const preview = useMemo(
            () => previewDuplicate(data, newStartDate),
            [data, newStartDate]
        );

        const conflicts = useMemo(
            () =>
                findTripConflicts(
                    preview.newStartDate,
                    preview.newEndDate,
                    otherTrips
                ),
            [preview.newStartDate, preview.newEndDate, otherTrips]
        );

        const past = startsInPast(newStartDate);

        const handleConfirm = () => {
            if (!newStartDate) return;
            modalRef.current?.closeModal();
            onConfirm(newStartDate);
        };

        return (
            <ModalButton
                ref={modalRef}
                title="Duplicate this trip"
                buttonProps={null}
                containerClassName="duplicate-trip-modal"
            >
                <div className="duplicate-trip-form">
                    <p className="duplicate-trip-intro">
                        Creates a fresh <strong>Planning</strong> copy of{' '}
                        <strong>{data.name || 'this trip'}</strong>. Every
                        activity keeps its time and duration, shifted to start
                        on the date you pick.
                    </p>

                    <Grid container>
                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <InputField
                                label="New start date"
                                name="newStartDate"
                                type="date"
                                value={newStartDate}
                                onChange={(e) => setNewStartDate(e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    <div className="duplicate-trip-range">
                        <span className="duplicate-trip-range-label">New dates</span>
                        <span className="duplicate-trip-range-value">
                            {fmt(preview.newStartDate)} → {fmt(preview.newEndDate)}
                        </span>
                    </div>

                    {(past || conflicts.length > 0) && (
                        <div className="duplicate-trip-warnings">
                            {past && (
                                <div className="duplicate-trip-warning">
                                    <WarningAmberRoundedIcon className="duplicate-trip-warning-icon" />
                                    <span>
                                        This copy starts in the past. It&rsquo;s
                                        created as a Planning trip you can re-date
                                        anytime.
                                    </span>
                                </div>
                            )}
                            {conflicts.length > 0 && (
                                <div className="duplicate-trip-warning">
                                    <WarningAmberRoundedIcon className="duplicate-trip-warning-icon" />
                                    <span>
                                        Overlaps with{' '}
                                        {conflicts
                                            .map(
                                                (c) =>
                                                    `${c.name || 'a trip'} (${fmt(
                                                        c.startDate
                                                    )} → ${fmt(c.endDate)})`
                                            )
                                            .join(', ')}
                                        .
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {preview.days.length > 0 && (
                        <div className="duplicate-trip-preview">
                            <div className="duplicate-trip-preview-head">
                                <span>Day</span>
                                <span>New date</span>
                                <span>Activities</span>
                            </div>
                            <div className="duplicate-trip-preview-body">
                                {preview.days.map((d, i) => (
                                    <div
                                        className="duplicate-trip-preview-row"
                                        key={`${d.oldDate}-${i}`}
                                    >
                                        <span>Day {i + 1}</span>
                                        <span>{fmt(d.newDate)}</span>
                                        <span>{d.activityCount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="duplicate-trip-actions">
                        <ButtonCustom
                            type="line"
                            label="Cancel"
                            onClick={() => modalRef.current?.closeModal()}
                        />
                        <ButtonCustom
                            type="standard"
                            label="Create copy"
                            onClick={handleConfirm}
                            disabled={!newStartDate}
                        />
                    </div>
                </div>
            </ModalButton>
        );
    }
);

DuplicateTripModal.displayName = 'DuplicateTripModal';

export default DuplicateTripModal;
