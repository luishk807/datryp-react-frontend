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
    /** Accessible label for buttons whose visible content is non-textual (e.g. an avatar initial or icon). */
    ariaLabel?: string;
    /** The native HTML `type` attribute (`button` / `submit` / `reset`). Distinct from
     *  the visual `type` prop above. Omit to keep the browser default. */
    nativeType?: 'button' | 'submit' | 'reset';
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
    ariaLabel,
    nativeType,
}: ButtonCustomProps) => {
    return (
        <button
            type={nativeType}
            style={style ?? undefined}
            disabled={disabled}
            aria-label={ariaLabel}
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
