import { useState } from 'react';
import './index.scss';
import classNames from 'classnames';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';

export type StarInputSize = 'sm' | 'md' | 'lg';

export interface StarInputProps {
    /** Current rating value, 1-5. Use 0 when no rating has been picked. */
    value: number;
    /** Called with the new rating when the user clicks a star. Required for
     *  interactive mode; ignored when `readonly` is true. */
    onChange?: (v: number) => void;
    /** When true the stars render as a non-interactive display chip with
     *  `role="img"`; otherwise they form a `role="radiogroup"` with hover
     *  preview. */
    readonly?: boolean;
    /** Visual size preset. `sm` = 1rem, `md` = 1.3rem, `lg` = 1.8rem. */
    size?: StarInputSize;
}

/**
 * Generic 5-star rating widget — used by review forms, review cards, and
 * the inline reviews summary. Keep this dependency-free of any
 * review-specific code so it can be reused for other rating UIs.
 */
const StarInput = ({
    value,
    onChange,
    readonly = false,
    size = 'md',
}: StarInputProps) => {
    const [hover, setHover] = useState<number | null>(null);
    const display = hover ?? value;
    return (
        <span
            className={classNames('star-input', `size-${size}`, { readonly })}
            role={readonly ? 'img' : 'radiogroup'}
            aria-label={readonly ? `${value} out of 5 stars` : 'Pick a rating'}
        >
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= display;
                const Icon = filled ? StarRoundedIcon : StarOutlineRoundedIcon;
                return (
                    <Icon
                        key={n}
                        className={classNames('star-input-star', { filled })}
                        onMouseEnter={readonly ? undefined : () => setHover(n)}
                        onMouseLeave={readonly ? undefined : () => setHover(null)}
                        onClick={readonly ? undefined : () => onChange?.(n)}
                        role={readonly ? undefined : 'radio'}
                        aria-checked={!readonly && value === n ? true : undefined}
                    />
                );
            })}
        </span>
    );
};

export default StarInput;
