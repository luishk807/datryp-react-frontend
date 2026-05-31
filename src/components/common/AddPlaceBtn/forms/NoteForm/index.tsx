import { Grid, TextField } from '@mui/material';
import type { FormController } from '../../types';

export interface NoteFormProps {
    controller: FormController;
}

/** NOTE-kind form body. Notes are free-form text only — no title, no
 *  suggestions, no smart entry. The first line of the note doubles as the
 *  timeline headline (the parent's submit helper derives `name`). Custom
 *  is the only method, so the ADD wizard auto-skips the method chooser
 *  and renders this directly. */
const NoteForm = ({ controller }: NoteFormProps) => {
    const { place, handleOnChange } = controller;

    return (
        <Grid container>
            <Grid item lg={12} xs={12} className="py-5">
                <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={12}
                    variant="outlined"
                    value={place.note ?? ''}
                    name="note"
                    label="Note"
                    placeholder="Jot down anything — reminders, ideas, links, packing checklist…"
                    onChange={(e) => handleOnChange('note', e.target.value)}
                />
            </Grid>
        </Grid>
    );
};

export default NoteForm;
