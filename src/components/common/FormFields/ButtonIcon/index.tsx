import type { ComponentType, CSSProperties, MouseEventHandler } from 'react';
import './index.css';
import classNames from 'classnames';

type ButtonIconVariant = 'text' | 'standard' | 'text-plain';

export interface ButtonIconProps {
    title?: string;
    Icon?: ComponentType<unknown> | null;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    style?: CSSProperties;
    type?: ButtonIconVariant;
    isViewMode?: boolean;
}

const ButtonIcon = ({
    title = '',
    Icon,
    onClick,
    style,
    type = 'standard',
    isViewMode = false,
}: ButtonIconProps) => {
    if (isViewMode) return null;

    return (
        <button
            onClick={onClick}
            style={style}
            className={classNames({
                'button-icon': type === 'standard',
                'button-simple': type === 'text',
                'button-no-style': type === 'text-plain',
            })}
        >
            {title} {Icon && <Icon />}
        </button>
    );
};

export default ButtonIcon;
