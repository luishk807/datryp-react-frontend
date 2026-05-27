import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import moment from 'moment';
import './index.scss';
import { Autocomplete, Grid, TextField } from '@mui/material';
import ModalButton, {
    type ModalButtonHandle,
} from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { useUser } from 'context/UserContext';
import type { Friend } from 'types';

export interface MarkPaidValue {
    /** Selected payer in the `{ id, name }` shape that round-trips
     *  through `Activity.paidBy` / `FlightInfo.paidBy`. `id` is the
     *  backend user UUID (Friend.userId). */
    paidBy: { id: string; name: string | null };
    /** ISO `YYYY-MM-DD` date. */
    paidAt: string;
}

export interface MarkPaidModalHandle {
    open: () => void;
    close: () => void;
}

export interface MarkPaidModalProps {
    /** Trip participants the payer can be chosen from. Includes the
     *  organizer + every friend on the trip. Only entries with a real
     *  backend `userId` are selectable — legacy mock friends without
     *  a UUID can't be persisted. */
    participants: Friend[];
    /** Pre-filled values when editing an already-paid activity.
     *  `paidAt` is YYYY-MM-DD; `paidBy.id` is the user UUID. */
    initialPaidAt?: string | null;
    initialPaidBy?: { id: string; name: string | null } | null;
    /** Save handler. Called with the picked payer + date. */
    onSubmit: (value: MarkPaidValue) => void;
    /** Clear handler — wipes both `paidAt` and `paidBy`. Only rendered
     *  when there's an existing paid attestation to clear (i.e.
     *  `initialPaidAt` is set). */
    onClear?: () => void;
}

interface PayerOption {
    /** Backend user UUID — same value used for `paidBy.id`. */
    id: string;
    label: string;
}

const todayIso = (): string => moment().format('YYYY-MM-DD');

const labelOf = (f: Friend): string =>
    f.label ?? f.name ?? `Friend #${f.id}`;

/** Participant → PayerOption with a UUID. Mock friends without a
 *  backend `userId` are filtered out — they can't be persisted, so
 *  surfacing them in the picker would only let the user pick a value
 *  that would silently drop on save. */
const buildPayerOptions = (participants: Friend[]): PayerOption[] => {
    const out: PayerOption[] = [];
    for (const p of participants) {
        if (!p.userId) continue;
        out.push({ id: p.userId, label: labelOf(p) });
    }
    return out;
};

const MarkPaidModal = forwardRef<MarkPaidModalHandle, MarkPaidModalProps>(
    (
        {
            participants,
            initialPaidAt,
            initialPaidBy,
            onSubmit,
            onClear,
        },
        ref,
    ) => {
        const modalRef = useRef<ModalButtonHandle>(null);
        const { user } = useUser();

        const payerOptions = useMemo(
            () => buildPayerOptions(participants),
            [participants],
        );

        // Default payer = current user when unpaid. Matches the spec:
        // "Save" should be a one-tap action for the common case of
        // "the organizer just paid for this".
        const defaultPayerId =
            initialPaidBy?.id ?? user?.id ?? null;

        const [paidAt, setPaidAt] = useState<string>(
            initialPaidAt ?? todayIso(),
        );
        const [payerId, setPayerId] = useState<string | null>(
            defaultPayerId,
        );

        // Re-sync when the modal is opened against a different activity
        // (e.g. organizer switches from one card to another without
        // unmounting the parent). Keying on the initial values means a
        // re-open with the same activity preserves any in-flight edit.
        const initSignature = `${initialPaidAt ?? ''}|${
            initialPaidBy?.id ?? ''
        }|${user?.id ?? ''}`;
        useEffect(() => {
            setPaidAt(initialPaidAt ?? todayIso());
            setPayerId(defaultPayerId);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initSignature]);

        useImperativeHandle(
            ref,
            () => ({
                open: () => modalRef.current?.openModel(),
                close: () => modalRef.current?.closeModal(),
            }),
            [],
        );

        const selectedOption: PayerOption | null = useMemo(() => {
            if (!payerId) return null;
            return (
                payerOptions.find((o) => o.id === payerId) ?? {
                    id: payerId,
                    // Fall back to whatever name we already have on the
                    // existing paidBy so the picker shows the name on
                    // first open even if the user is no longer a current
                    // trip participant (left the trip after paying).
                    label: initialPaidBy?.name ?? 'Friend',
                }
            );
        }, [payerId, payerOptions, initialPaidBy?.name]);

        const handleSave = () => {
            if (!payerId || !paidAt) return;
            const name =
                payerOptions.find((o) => o.id === payerId)?.label ??
                initialPaidBy?.name ??
                null;
            onSubmit({ paidBy: { id: payerId, name }, paidAt });
            modalRef.current?.closeModal();
        };

        const handleClear = () => {
            onClear?.();
            modalRef.current?.closeModal();
        };

        const canSave = Boolean(payerId && paidAt);
        const showClear = Boolean(initialPaidAt && onClear);

        return (
            <ModalButton
                ref={modalRef}
                title={initialPaidAt ? 'Edit payment' : 'Mark as paid'}
                buttonProps={null}
            >
                <Grid container className="mark-paid-modal">
                    <Grid item lg={12} md={12} xs={12} className="field-row">
                        <Autocomplete<PayerOption, false, false, false>
                            options={payerOptions}
                            value={selectedOption}
                            onChange={(_e, val) => setPayerId(val ? val.id : null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            getOptionLabel={(o) => o.label}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Paid by"
                                    placeholder="Pick a participant"
                                />
                            )}
                        />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="field-row">
                        <InputField
                            type="date"
                            label="Paid on"
                            value={paidAt}
                            onChange={(e) => setPaidAt(e.target.value)}
                        />
                    </Grid>
                    <Grid
                        item
                        lg={12}
                        md={12}
                        xs={12}
                        className="mark-paid-actions"
                    >
                        {showClear && (
                            <ButtonCustom
                                onClick={handleClear}
                                label="Mark as unpaid"
                                type="line"
                                capitalizeType="capitalize"
                            />
                        )}
                        <ButtonCustom
                            onClick={handleSave}
                            label="Save"
                            type="standard"
                            capitalizeType="capitalize"
                            disabled={!canSave}
                        />
                    </Grid>
                </Grid>
            </ModalButton>
        );
    },
);

MarkPaidModal.displayName = 'MarkPaidModal';

export default MarkPaidModal;
