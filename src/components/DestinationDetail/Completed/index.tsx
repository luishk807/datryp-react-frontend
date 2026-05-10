import { Typography, Grid } from '@mui/material';
import Confetti from 'components/Confetti';
import { useNavigate } from 'react-router-dom';
import './index.css';
import Button from 'components/common/FormFields/ButtonCustom';

type CompleteNavTarget = 'home' | 'account';

export interface CompleteProps {
    onReset?: () => void;
}

const Complete = ({ onReset: _onReset }: CompleteProps) => {
    const navigate = useNavigate();
    const handleClick = (target: CompleteNavTarget) => {
        switch (target) {
            case 'home':
                navigate('/');
                break;
            case 'account':
                navigate('/account');
                break;
        }
    };

    return (
        <>
            <Grid container>
                <Grid item lg={6} xs={12} id="trip-complete">
                    <Grid container className="trip-content">
                        <Grid item lg={12} xs={12} className="title">
                            <Typography className="content">
                                <span className="text-1">Congratulation! </span>
                                <span className="text-2">All Set!</span>
                            </Typography>
                        </Grid>
                        <Grid item lg={12} xs={12} className="main-image">
                            <img src="/images/complete.png" width="400" />
                        </Grid>
                        <Grid item lg={12} xs={12} className="button">
                            <Grid container spacing={1}>
                                <Grid item xs={12} lg={6}>
                                    <Button
                                        type="line"
                                        onClick={() => handleClick('home')}
                                        label="Return Home"
                                    />
                                </Grid>
                                <Grid item xs={12} lg={6}>
                                    <Button
                                        type="line"
                                        onClick={() => handleClick('account')}
                                        label="View Your Trip"
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Confetti activate={true} />
        </>
    );
};

export default Complete;
