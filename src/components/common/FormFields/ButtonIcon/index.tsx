import type { ComponentType, CSSProperties, MouseEventHandler } from 'react';
import './index.scss';
import classNames from 'classnames';

type ButtonIconVariant = 'text' | 'standard' | 'text-plain';
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
    type = 'standard',
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
                'button-icon': type === 'standard',
                'button-simple': type === 'text',
                'button-no-style': type === 'text-plain',
            })}
        >
            {iconPosition === 'start' && iconNode}
            {title}
            {iconPosition === 'end' && iconNode}
        </button>
    );
};

export default ButtonIcon;
