import classnames from 'classnames';
import CheckIcon from '@mui/icons-material/Check';
import './index.scss';

export interface StepIconProps {
    active?: boolean;
    completed?: boolean;
}

/**
 * Compact colored-circle step indicator. Color carries the meaning —
 * gray=pending, orange=active (with a subtle glow), green=completed
 * (with a check). Numbers were removed because long wizards (7-9
 * steps) felt cluttered with all the digits across the top; the colors
 * + check still give clear "where am I / how much is done" without the
 * visual noise.
 */
const StepIcon = ({ active, completed }: StepIconProps) => {
    return (
        <div
            className={classnames('StepIconCustom', {
                active,
                completed,
            })}
        >
            {completed && <CheckIcon className="check-icon" />}
        </div>
    );
};

export default StepIcon;
