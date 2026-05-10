import { Grid } from '@mui/material';
import './index.css';
import Link from '@mui/material/Link';
import type { TripState } from 'types/trip';

interface TripBoxProps {
    data?: TripState | null;
}

export const TripBox = ({ data: _data = null }: TripBoxProps) => {
    return (
        <Link href="/" underline="none">
            <Grid container id="trip-box">
                <Grid item lg={12} md={12} xs={12} className="container">
                    <Grid item lg={12} md={12} xs={12} className="image">
                        <img src="/images/sample/china1.jpg" />
                    </Grid>
                    <Grid item lg={12} md={12} xs={12} className="content">
                        <ul>
                            <li className="title">Name: China Trip</li>
                            <li>Orgnizer: Joanna</li>
                            <li>Date: 10 Oct - 12 Oct 2024</li>
                            <li>Status: Active</li>
                        </ul>
                    </Grid>
                </Grid>
            </Grid>
        </Link>
    );
};

export default TripBox;
