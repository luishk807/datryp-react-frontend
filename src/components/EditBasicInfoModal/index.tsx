import {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import FriendPicker from 'components/DestinationDetail/FriendPicker';
import ErrorAlert from 'components/common/ErrorAlert';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import type { Friend, TripState } from 'types';

export interface EditBasicInfoModalProps {
    data: TripState;
    isSaving: boolean;
    saveError?: string | null;
    /** Persists the edited basic info. Resolves `true` on success so the
     *  modal can close itself; `false` keeps it open with the error shown. */
    onSave: (next: TripState) => Promise<boolean>;
}

const EditBasicInfoModal = forwardRef<ModalButtonHandle, EditBasicInfoModalProps>(
    ({ data, isSaving, saveError = null, onSave }, ref) => {
        const modalRef = useRef<ModalButtonHandle>(null);
        const [draft, setDraft] = useState<TripState>(data);

        useImperativeHandle(ref, () => ({
            openModel: () => {
                // Seed a fresh draft from the latest server-synced data
                // before opening so each open starts clean.
                setDraft(data);
                modalRef.current?.openModel();
            },
            closeModal: () => modalRef.current?.closeModal(),
        }));

        // Destination is intentionally read-only here — changing it
        // cascades into the itinerary day structure, which belongs in the
        // full stepper editor, not this quick basic-info modal.
        const destinationLabel = useMemo(() => {
            const names = (draft.destinations ?? [])
                .map((d) => d.country?.name)
                .filter((n): n is string => !!n);
            return Array.from(new Set(names)).join(', ');
        }, [draft.destinations]);

        const handleOrganizerChange = (
            _name: string | undefined,
            e: { target: { value: Friend[] } }
        ) => {
            setDraft((prev) => ({ ...prev, organizer: e.target.value }));
        };

        const handleParticipantsChange = (
            _name: string | undefined,
            e: { target: { value: Friend[] } }
        ) => {
            setDraft((prev) => ({ ...prev, friends: e.target.value }));
        };

        const isDirty = useMemo(
            () => JSON.stringify(draft) !== JSON.stringify(data),
            [draft, data]
        );

        const handleClose = () => setDraft(data);

        const handleSave = async () => {
            const ok = await onSave(draft);
            if (ok) modalRef.current?.closeModal();
        };

        return (
            <ModalButton
                ref={modalRef}
                title="Edit basic info"
                buttonProps={null}
                onClose={handleClose}
                containerClassName="edit-basic-info-modal"
            >
                <form className="edit-basic-info-form">
                    <Grid container className="step-section">
                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <InputField
                                label="Trip Name"
                                name="name"
                                defaultValue={draft.name ?? ''}
                                onChange={(e) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </Grid>

                        {destinationLabel && (
                            <Grid item lg={12} md={12} xs={12} className="form-input">
                                <InputField
                                    label="Where"
                                    name="where"
                                    value={destinationLabel}
                                    disabled
                                    onChange={() => {}}
                                />
                            </Grid>
                        )}

                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <FriendPicker
                                title="Select Organizer"
                                name="organizer"
                                selectedOptions={draft.organizer ?? []}
                                onChange={handleOrganizerChange}
                            />
                        </Grid>

                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <FriendPicker
                                title="Participants"
                                name="friends"
                                selectedOptions={draft.friends ?? []}
                                onChange={handleParticipantsChange}
                            />
                        </Grid>

                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <InputField
                                label="Budget"
                                name="budget"
                                defaultValue={String(draft.budget ?? '')}
                                onChange={(e) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        budget: e.target.value,
                                    }))
                                }
                            />
                        </Grid>

                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <InputField
                                label="Start Date"
                                name="startDate"
                                type="date"
                                defaultValue={draft.startDate ?? ''}
                                onChange={(e) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        startDate: e.target.value,
                                    }))
                                }
                            />
                        </Grid>

                        <Grid item lg={12} md={12} xs={12} className="form-input">
                            <InputField
                                label="End Date"
                                name="endDate"
                                type="date"
                                defaultValue={draft.endDate ?? ''}
                                onChange={(e) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        endDate: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                    </Grid>

                    {saveError && (
                        <ErrorAlert className="edit-basic-info-error">
                            {saveError}
                        </ErrorAlert>
                    )}

                    <div className="edit-basic-info-actions">
                        <ButtonCustom
                            type="line"
                            label="Cancel"
                            onClick={() => modalRef.current?.closeModal()}
                            disabled={isSaving}
                        />
                        <ButtonCustom
                            type="standard"
                            label={isSaving ? 'Saving…' : 'Save'}
                            onClick={handleSave}
                            disabled={isSaving || !isDirty}
                        />
                    </div>
                </form>
            </ModalButton>
        );
    }
);

EditBasicInfoModal.displayName = 'EditBasicInfoModal';

export default EditBasicInfoModal;
