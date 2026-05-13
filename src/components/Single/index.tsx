import { Grid } from '@mui/material';
import './index.scss';
import Activities from 'components/DestinationDetail/Activities';
import AddPlaceBtn from 'components/common/AddPlaceBtn';
import type { Activity } from 'types';

interface SingleProps {
    trips?: Activity[] | null;
}

const Single = ({ trips = null }: SingleProps) => {
    return trips ? (
        <Grid item lg={12} className="content">
            <Activities
                activities={trips}
                onChangePlace={() => {}}
                onChangeBudget={() => {}}
            />
        </Grid>
    ) : (
        <Grid item lg={12} className="content item-border">
            <AddPlaceBtn onChange={() => {}} />
        </Grid>
    );
};

export default Single;
