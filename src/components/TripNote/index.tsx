import { useEffect, useRef, useState } from 'react';
import './index.scss';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import { useSaveTripNote } from 'api/hooks/useSaveTripNote';

export interface TripNoteProps {
    tripId: string;
    /** Persisted note from the server. */
    note?: string;
    /** Owner / organizer — only they can add or edit. Others read it. */
    canEdit: boolean;
}

const NOTE_MAX_LEN = 2000;

/**
 * Free-text recap shown right under the trip title, editable in any status
 * (it persists via PUT /me/trip-note, independent of the Planning-only full
 * save). Non-editors see the note read-only; if there's no note and the user
 * can't edit, nothing renders.
 */
const TripNote = ({ tripId, note, canEdit }: TripNoteProps) => {
    const saveNote = useSaveTripNote();
    const [editing, setEditing] = useState(false);
    // Local display copy so a save reflects immediately, before the
    // itineraries query refetches. Re-syncs when the server value changes.
    const [value, setValue] = useState(note ?? '');
    const [draft, setDraft] = useState(note ?? '');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!editing) setValue(note ?? '');
    }, [note, editing]);

    const openEditor = () => {
        setDraft(value);
        setError(null);
        setEditing(true);
    };

    useEffect(() => {
        if (editing) textareaRef.current?.focus();
    }, [editing]);

    const handleSave = async () => {
        const next = draft.trim();
        setError(null);
        try {
            await saveNote.mutateAsync({ tripId, note: next || null });
            setValue(next);
            setEditing(false);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to save the note.'
            );
        }
    };

    const handleCancel = () => {
        setDraft(value);
        setError(null);
        setEditing(false);
    };

    const badge = (
        <span className="trip-note-badge">
            <StickyNote2OutlinedIcon className="trip-note-badge-icon" />
            Trip recap
        </span>
    );

    if (editing) {
        return (
            <div className="trip-note trip-note-card trip-note-editing">
                {badge}
                <textarea
                    ref={textareaRef}
                    className="trip-note-input"
                    value={draft}
                    maxLength={NOTE_MAX_LEN}
                    placeholder="How did the trip go? Anything to remember for next time…"
                    onChange={(e) => setDraft(e.target.value)}
                />
                {error && (
                    <ErrorAlert className="trip-note-error">{error}</ErrorAlert>
                )}
                <div className="trip-note-actions">
                    <span className="trip-note-count">
                        {draft.length}/{NOTE_MAX_LEN}
                    </span>
                    <ButtonCustom
                        type="line"
                        label="Cancel"
                        onClick={handleCancel}
                        disabled={saveNote.isPending}
                    />
                    <ButtonCustom
                        type="standard"
                        label={saveNote.isPending ? 'Saving…' : 'Save note'}
                        onClick={handleSave}
                        disabled={saveNote.isPending}
                    />
                </div>
            </div>
        );
    }

    if (!value) {
        if (!canEdit) return null;
        return (
            <button
                type="button"
                className="trip-note trip-note-add"
                onClick={openEditor}
            >
                <StickyNote2OutlinedIcon className="trip-note-add-icon" />
                <span>Add a trip recap</span>
            </button>
        );
    }

    // Saved state is intentionally minimal: just the text full-width with a
    // quiet edit button — no card, icon, label, or background.
    return (
        <div className="trip-note trip-note-view">
            <p className="trip-note-text">{value}</p>
            {canEdit && (
                <button
                    type="button"
                    className="trip-note-edit"
                    aria-label="Edit trip recap"
                    onClick={openEditor}
                >
                    <EditOutlinedIcon fontSize="small" />
                </button>
            )}
        </div>
    );
};

export default TripNote;
