import classnames from 'classnames';
import type { ReactNode } from 'react';
import './index.css';

export interface StepIconProps {
    active?: boolean;
    completed?: boolean;
    icon?: ReactNode;
}

const StepIcon = ({ active, icon }: StepIconProps) => {
    return (
        <div className={classnames('StepIconCustom', { active })}>
            <div className="label">{icon}</div>
        </div>
    );
};

export default StepIcon;
