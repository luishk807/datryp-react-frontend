/**
 * Step 3 — Password. Show/hide toggle for clarity (people fat-finger
 * passwords on signup constantly). Backend min length is 8, mirrored
 * here so a user doesn't trip a backend validation a step later.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { IconButton } from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import './index.scss';

export interface StepPasswordProps {
    value: string;
    onChange: (next: string) => void;
    onContinue: () => void;
}

const MIN_LEN = 8;

const StepPassword = ({ value, onChange, onContinue }: StepPasswordProps) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && value.length >= MIN_LEN) onContinue();
    };

    return (
        <>
            <h1 className="signup-step-title" id="signup-password-q">
                {t('auth.signup.password.title')}
            </h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.password.subtitle', { min: MIN_LEN })}
            </p>
            <div className="signup-password-wrap">
                <input
                    className="signup-step-input signup-password-input"
                    type={show ? 'text' : 'password'}
                    autoFocus
                    aria-labelledby="signup-password-q"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={128}
                />
                <IconButton
                    className="signup-password-toggle"
                    size="small"
                    aria-label={
                        show
                            ? t('auth.common.hidePassword')
                            : t('auth.common.showPassword')
                    }
                    onClick={() => setShow((s) => !s)}
                >
                    {show ? (
                        <VisibilityOffIcon fontSize="small" />
                    ) : (
                        <VisibilityIcon fontSize="small" />
                    )}
                </IconButton>
            </div>
            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={t('auth.common.continue')}
                    onClick={onContinue}
                    disabled={value.length < MIN_LEN}
                />
                {value.length > 0 && value.length < MIN_LEN && (
                    <span className="signup-password-hint">
                        {t('auth.signup.password.moreToGo', {
                            n: MIN_LEN - value.length,
                        })}
                    </span>
                )}
            </div>
        </>
    );
};

export default StepPassword;
