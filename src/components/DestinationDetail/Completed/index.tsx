import CelebrationIcon from '@mui/icons-material/Celebration';
import Confetti from 'components/Confetti';
import { useNavigate } from 'react-router-dom';
import './index.css';
import Button from 'components/common/FormFields/ButtonCustom';

type CompleteNavTarget = 'home' | 'trips';

export interface CompleteProps {
    onReset?: () => void;
}

const Complete = ({ onReset }: CompleteProps) => {
    const navigate = useNavigate();

    const handleClick = (target: CompleteNavTarget) => {
        if (target === 'home') navigate('/');
        else navigate('/trips');
    };

    const handleSecondary = () => {
        if (onReset) onReset();
        else handleClick('home');
    };

    return (
        <>
            <section className="trip-complete">
                <div className="trip-complete-card">
                    <span className="trip-complete-stripe" aria-hidden="true" />

                    <div className="trip-complete-icon">
                        <CelebrationIcon />
                    </div>

                    <h1 className="trip-complete-title">Your trip is all set!</h1>
                    <p className="trip-complete-subtitle">
                        Pack your bags — we've saved every detail.
                    </p>

                    <div className="trip-complete-image">
                        <img src="/images/complete.png" alt="Trip complete" />
                    </div>

                    <div className="trip-complete-actions">
                        <Button
                            type="standard"
                            capitalizeType="uppercase"
                            onClick={() => handleClick('trips')}
                            label="View Your Trip"
                        />
                        <Button
                            type="line"
                            capitalizeType="uppercase"
                            onClick={handleSecondary}
                            label={onReset ? 'Plan Another' : 'Return Home'}
                        />
                    </div>
                </div>
            </section>

            <Confetti activate={true} />
        </>
    );
};

export default Complete;
