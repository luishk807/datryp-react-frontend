import { Grid, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                    label={t('addForms.activity.note.label')}
                    placeholder={t('addForms.activity.note.placeholder')}
                    onChange={(e) => handleOnChange('note', e.target.value)}
                />
            </Grid>
        </Grid>
    );
};

export default NoteForm;
