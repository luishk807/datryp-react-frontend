import { IconButton, Tooltip } from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import classnames from 'classnames';
import './index.scss';

interface NotifyParticipantsCheckboxProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    /** Tooltip label override. Kept for parity with the old API; the
     *  default copy explains what the bell controls. */
    label?: string;
    helperText?: string;
    className?: string;
}

const DEFAULT_LABEL_ON = 'Participants will be notified of changes';
const DEFAULT_LABEL_OFF =
    'Participants will NOT be notified of changes (click to enable)';

/**
 * Per-save opt-out for participant notifications, rendered as a single
 * bell IconButton. The icon flips between "active" (filled, green) and
 * "off" (muted, grey) to reflect state. The tooltip explains what the
 * toggle does so first-time users aren't guessing.
 *
 * Defaults to ON in every call site — clicking it once disables the
 * fan-out for the next save action.
 */
const NotifyParticipantsCheckbox = ({
    checked,
    onChange,
    disabled = false,
    label,
    className,
}: NotifyParticipantsCheckboxProps) => {
    const tooltip = label ?? (checked ? DEFAULT_LABEL_ON : DEFAULT_LABEL_OFF);
    return (
        <Tooltip title={tooltip} arrow>
            <span
                // Tooltip needs a real DOM child for disabled IconButtons;
                // the wrapper span gives it a stable target.
                className={classnames(
                    'notify-participants-bell-wrap',
                    className
                )}
            >
                <IconButton
                    className={classnames('notify-participants-bell', {
                        'is-on': checked,
                        'is-off': !checked,
                    })}
                    onClick={() => onChange(!checked)}
                    disabled={disabled}
                    aria-label={tooltip}
                    aria-pressed={checked}
                    size="small"
                >
                    {checked ? (
                        <NotificationsActiveRoundedIcon fontSize="small" />
                    ) : (
                        <NotificationsOffRoundedIcon fontSize="small" />
                    )}
                </IconButton>
            </span>
        </Tooltip>
    );
};

export default NotifyParticipantsCheckbox;
