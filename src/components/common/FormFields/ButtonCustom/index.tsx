import type { CSSProperties, MouseEventHandler } from 'react';
import './index.css';
import classNames from 'classnames';

type ButtonVariant = 'plain' | 'text' | 'standard' | 'standard-small' | 'none' | 'line';
type CapitalizeType = 'capitalize' | 'uppercase' | 'lowercase' | 'none';

export interface ButtonCustomProps {
    label?: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    capitalizeType?: CapitalizeType;
    type?: ButtonVariant;
    style?: CSSProperties | null;
}

const ButtonCustom = ({
    label = '',
    onClick,
    capitalizeType = 'capitalize',
    type = 'standard',
    style = null,
}: ButtonCustomProps) => {
    return (
        <button
            style={style ?? undefined}
            className={classNames({
                'main-button': type === 'standard',
                'main-line': type === 'line',
                'plain-button': type === 'plain',
                'text-button': type === 'text',
                'standard-small': type === 'standard-small',
                capitalize: capitalizeType === 'capitalize',
                lowercase: capitalizeType === 'lowercase',
                uppercase: capitalizeType === 'uppercase',
                none: capitalizeType === 'none',
            })}
            onClick={onClick}
        >
            {label}
        </button>
    );
};

export default ButtonCustom;
