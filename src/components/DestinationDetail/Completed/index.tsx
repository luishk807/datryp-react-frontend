import CelebrationIcon from '@mui/icons-material/Celebration';
import { useTranslation } from 'react-i18next';
import Confetti from 'components/Confetti';
import { useNavigate } from 'react-router-dom';
import './index.scss';
import Button from 'components/common/FormFields/ButtonCustom';

type CompleteNavTarget = 'home' | 'trips';

export interface CompleteProps {
    onReset?: () => void;
}

const Complete = ({ onReset }: CompleteProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

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

                    <h1 className="trip-complete-title">
                        {t('activity.complete.title')}
                    </h1>
                    <p className="trip-complete-subtitle">
                        {t('activity.complete.subtitle')}
                    </p>

                    <div className="trip-complete-image">
                        <img
                            src="/images/complete.png"
                            alt={t('activity.complete.imageAlt')}
                        />
                    </div>

                    <div className="trip-complete-actions">
                        <Button
                            type="standard"
                            capitalizeType="uppercase"
                            onClick={() => handleClick('trips')}
                            label={t('activity.complete.viewTrip')}
                        />
                        <Button
                            type="line"
                            capitalizeType="uppercase"
                            onClick={handleSecondary}
                            label={
                                onReset
                                    ? t('activity.complete.planAnother')
                                    : t('activity.complete.returnHome')
                            }
                        />
                    </div>
                </div>
            </section>

            <Confetti activate={true} />
        </>
    );
};

export default Complete;
