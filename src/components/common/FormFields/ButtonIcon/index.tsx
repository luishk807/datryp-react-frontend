import type { ComponentType, CSSProperties, MouseEventHandler } from 'react';
import './index.scss';
import classNames from 'classnames';
import { BUTTON_VARIANT } from 'constants';

type ButtonIconVariant =
    | typeof BUTTON_VARIANT.TEXT
    | typeof BUTTON_VARIANT.STANDARD
    | typeof BUTTON_VARIANT.TEXT_PLAIN;
type IconPosition = 'start' | 'end';

export interface ButtonIconProps {
    title?: string;
    Icon?: ComponentType<any> | null;
    iconProps?: Record<string, unknown>;
    iconPosition?: IconPosition;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    style?: CSSProperties;
    type?: ButtonIconVariant;
    isViewMode?: boolean;
    className?: string;
    ariaLabel?: string;
    disabled?: boolean;
}

const ButtonIcon = ({
    title = '',
    Icon,
    iconProps,
    iconPosition = 'end',
    onClick,
    style,
    type = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
    className,
    ariaLabel,
    disabled = false,
}: ButtonIconProps) => {
    if (isViewMode) return null;

    const iconNode = Icon ? <Icon {...(iconProps ?? {})} /> : null;

    return (
        <button
            onClick={onClick}
            style={style}
            aria-label={ariaLabel}
            disabled={disabled}
            className={classNames(className, {
                'button-icon': type === BUTTON_VARIANT.STANDARD,
                'button-simple': type === BUTTON_VARIANT.TEXT,
                'button-no-style': type === BUTTON_VARIANT.TEXT_PLAIN,
            })}
        >
            {iconPosition === 'start' && iconNode}
            {title}
            {iconPosition === 'end' && iconNode}
        </button>
    );
};

export default ButtonIcon;
