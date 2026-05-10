import type { MouseEventHandler } from 'react';
import './index.css';
import _ from 'lodash';
import { Grid } from '@mui/material';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';

interface StatusData {
    id?: number;
    name?: string;
}

export interface StatusProps {
    data?: StatusData | null;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    isViewMode?: boolean;
}

export const Status = ({ data = null, onClick, isViewMode = false }: StatusProps) => {
    return (
        <Grid container id="trip-status">
            <Grid item lg={12} md={12} xs={12} className="status-label">
                Status&nbsp;
                <ButtonIcon isViewMode={isViewMode} onClick={onClick} title="edit" type="text" />:
            </Grid>
            <Grid item lg={12} md={12} xs={12} className="status-data">
                {_.get(data, 'name')}
            </Grid>
        </Grid>
    );
};

export default Status;
