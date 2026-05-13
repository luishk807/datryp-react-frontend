import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import './index.scss';
import classNames from 'classnames';

type ButtonVariant = 'plain' | 'text' | 'standard' | 'standard-small' | 'none' | 'line';
type CapitalizeType = 'capitalize' | 'uppercase' | 'lowercase' | 'none';

export interface ButtonCustomProps {
    label?: string;
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    capitalizeType?: CapitalizeType;
    type?: ButtonVariant;
    style?: CSSProperties | null;
    disabled?: boolean;
    className?: string;
}

const ButtonCustom = ({
    label = '',
    children,
    onClick,
    capitalizeType = 'capitalize',
    type = 'standard',
    style = null,
    disabled = false,
    className,
}: ButtonCustomProps) => {
    return (
        <button
            style={style ?? undefined}
            disabled={disabled}
            className={classNames(className, {
                'main-button': type === 'standard',
                'main-line': type === 'line',
                'plain-button': type === 'plain',
                'text-button': type === 'text',
                'standard-small': type === 'standard-small',
                capitalize: capitalizeType === 'capitalize',
                lowercase: capitalizeType === 'lowercase',
                uppercase: capitalizeType === 'uppercase',
                none: capitalizeType === 'none',
                'is-disabled': disabled,
            })}
            onClick={onClick}
        >
            {children ?? label}
        </button>
    );
};

export default ButtonCustom;
