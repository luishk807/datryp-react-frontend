import type { ReactNode } from 'react';
import classNames from 'classnames';
import './index.scss';

export interface ErrorAlertProps {
    children?: ReactNode;
    className?: string;
}

const ErrorAlert = ({ children, className }: ErrorAlertProps) => {
    if (!children) return null;
    return (
        <p role="alert" className={classNames('error-alert', className)}>
            {children}
        </p>
    );
};

export default ErrorAlert;
