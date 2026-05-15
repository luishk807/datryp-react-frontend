import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import './index.scss';
import classNames from 'classnames';
import { BUTTON_VARIANT } from 'constants';
import type { ButtonVariant } from 'types';

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
    type = BUTTON_VARIANT.STANDARD,
    style = null,
    disabled = false,
    className,
}: ButtonCustomProps) => {
    return (
        <button
            style={style ?? undefined}
            disabled={disabled}
            className={classNames(className, {
                'main-button': type === BUTTON_VARIANT.STANDARD,
                'main-line': type === BUTTON_VARIANT.LINE,
                'plain-button': type === BUTTON_VARIANT.PLAIN,
                'text-button': type === BUTTON_VARIANT.TEXT,
                'standard-small': type === BUTTON_VARIANT.STANDARD_SMALL,
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
