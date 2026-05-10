import classnames from 'classnames';
import type { ReactNode } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import './index.css';

export interface StepIconProps {
    active?: boolean;
    completed?: boolean;
    icon?: ReactNode;
}

const StepIcon = ({ active, completed, icon }: StepIconProps) => {
    return (
        <div
            className={classnames('StepIconCustom', {
                active,
                completed,
            })}
        >
            <div className="label">
                {completed ? <CheckIcon className="check-icon" /> : icon}
            </div>
        </div>
    );
};

export default StepIcon;
