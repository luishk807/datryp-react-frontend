import type { MouseEventHandler } from 'react';
import { Grid, FormControlLabel } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import 'index.scss';

export interface CheckBoxCustomProps {
    label?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    value?: string;
    defaultCheck?: boolean;
}

export const CheckBoxCustom = ({
    label = 'test',
    onClick,
    value = '',
    defaultCheck = false,
}: CheckBoxCustomProps) => {
    return (
        <Grid container>
            <Grid item lg={12} md={12} xs={12}>
                <FormControlLabel
                    value={value}
                    control={<Checkbox checked={defaultCheck} onClick={onClick} />}
                    label={label}
                    labelPlacement="end"
                />
            </Grid>
        </Grid>
    );
};

export default CheckBoxCustom;
