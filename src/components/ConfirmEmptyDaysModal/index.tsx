import { forwardRef, useImperativeHandle, useRef } from 'react';
import moment from 'moment';
import ModalButton, {
    type ModalButtonHandle,
} from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

export interface ConfirmEmptyDaysModalHandle {
    openModel: () => void;
    closeModal: () => void;
}

export interface ConfirmEmptyDaysModalProps {
    /** ISO date strings for the days with zero activities. Order is the
     *  same as the itinerary timeline. */
    emptyDates: string[];
    /** "Confirm anyway" — proceed with the Planning → Confirmed move. */
    onConfirm: () => void;
    /** "Fill them in" — the soft option. Closes the modal, leaves the
     *  trip in Planning, returns the user to the itinerary. */
    onFillIn: () => void;
    /** "Update trip dates" — closes the modal and hands off to the
     *  trip-edit flow. */
    onEditDates: () => void;
    /** Disables the actions while the parent's save mutation is in
     *  flight (the Confirm button doubles as the loading indicator). */
    isSaving?: boolean;
}

/** Friendly date label that matches the day-block header format
 *  ("Wed, Aug 15"). Parsed loosely so any ISO-ish or `MM/DD/YYYY`
 *  string from the itinerary just works. */
const formatEmptyDate = (raw: string): string => {
    const m = moment(raw);
    return m.isValid() ? m.format('ddd, MMM D') : raw;
};

/**
 * Confirmation gate for the Planning → Confirmed transition when one or
 * more day blocks are empty. The badge opens this imperatively via
 * `ref.openModel()` and waits for the user's choice. Empty-day filtering
 * in the itinerary view + exports kicks in once the status flips, so
 * this modal exists purely to give the user an explicit heads-up before
 * the change is persisted.
 */
const ConfirmEmptyDaysModal = forwardRef<
    ConfirmEmptyDaysModalHandle,
    ConfirmEmptyDaysModalProps
>(({ emptyDates, onConfirm, onFillIn, onEditDates, isSaving = false }, ref) => {
    const modalRef = useRef<ModalButtonHandle>(null);

    useImperativeHandle(ref, () => ({
        openModel: () => modalRef.current?.openModel(),
        closeModal: () => modalRef.current?.closeModal(),
    }));

    return (
        <ModalButton
            ref={modalRef}
            title="Some days are empty"
            buttonProps={null}
            containerClassName="confirm-empty-days-modal"
        >
            <div className="confirm-empty-days-body">
                <p className="confirm-empty-days-helper">
                    Empty days won&rsquo;t show in your itinerary or exports once
                    the trip is confirmed. You can still re-add activities later.
                </p>
                <ul className="confirm-empty-days-list">
                    {emptyDates.map((date) => (
                        <li key={date} className="confirm-empty-days-item">
                            {formatEmptyDate(date)}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="confirm-empty-days-actions">
                <ButtonCustom
                    type={BUTTON_VARIANT.LINE}
                    capitalizeType="capitalize"
                    label="Fill them in"
                    onClick={onFillIn}
                    disabled={isSaving}
                />
                <ButtonCustom
                    type={BUTTON_VARIANT.TEXT}
                    capitalizeType="capitalize"
                    label="Update trip dates"
                    onClick={onEditDates}
                    disabled={isSaving}
                />
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD}
                    capitalizeType="capitalize"
                    label={isSaving ? 'Saving…' : 'Confirm anyway'}
                    onClick={onConfirm}
                    disabled={isSaving}
                />
            </div>
        </ModalButton>
    );
});

ConfirmEmptyDaysModal.displayName = 'ConfirmEmptyDaysModal';

export default ConfirmEmptyDaysModal;
