import {
    Menu as MuiMenu,
    MenuItem as MuiMenuItem,
    IconButton,
    type MenuProps as MuiMenuProps,
    type PopoverOrigin,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import './index.scss';

const DEFAULT_ANCHOR_ORIGIN: PopoverOrigin = {
    vertical: 'bottom',
    horizontal: 'right',
};

const DEFAULT_TRANSFORM_ORIGIN: PopoverOrigin = {
    vertical: 'top',
    horizontal: 'right',
};

export interface MenuProps extends Omit<MuiMenuProps, 'open' | 'children'> {
    /** Element to anchor the menu to. Open state is derived from this:
     *  truthy → open, `null` → closed. Both call sites in this codebase
     *  already model it this way, so the wrapper bakes it in. */
    anchorEl: HTMLElement | null;
    /** Optional className applied to the menu's paper surface, on top of
     *  the shared `.common-menu` look. Use only for paper-level tweaks
     *  beyond the default — most callers don't need this. */
    paperClassName?: string;
    /** On phones (≤767px), render the menu as a FULL-SCREEN sheet (100%
     *  width + height) with a close button in the top-right, instead of a
     *  small anchored dropdown. Prevents a tall menu (e.g. the account menu)
     *  from clipping its last row — the Logout item — off the bottom of the
     *  viewport. Desktop keeps the normal anchored dropdown. */
    fullScreenOnMobile?: boolean;
    /** Menu body — typically `<MenuActionItem>` and `<Divider>`. */
    children: React.ReactNode;
}

/**
 * Anchor-positioned dropdown menu — thin wrapper over MUI's `Menu` that
 * derives `open` from `anchorEl`, applies default anchor / transform
 * origins (bottom-right → top-right), and gives every menu the same
 * polished card look via the `.common-menu` paper class. Override
 * `anchorOrigin` / `transformOrigin` for non-default positioning; stack
 * extra paper-level classes via `paperClassName`. Pair with
 * `MenuActionItem` for items.
 */
const Menu = ({
    anchorEl,
    paperClassName,
    fullScreenOnMobile = false,
    anchorOrigin = DEFAULT_ANCHOR_ORIGIN,
    transformOrigin = DEFAULT_TRANSFORM_ORIGIN,
    slotProps,
    onClose,
    children,
    ...rest
}: MenuProps) => {
    const { t } = useTranslation();
    return (
        <MuiMenu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onClose}
            anchorOrigin={anchorOrigin}
            transformOrigin={transformOrigin}
            slotProps={{
                ...slotProps,
                paper: {
                    ...slotProps?.paper,
                    className: classNames(
                        'common-menu',
                        { 'common-menu--full-mobile': fullScreenOnMobile },
                        paperClassName
                    ),
                },
            }}
            {...rest}
        >
            {fullScreenOnMobile && (
                <div className="common-menu-mobile-head">
                    <IconButton
                        className="common-menu-close"
                        aria-label={t('common.close', { defaultValue: 'Close' })}
                        onClick={(e) => onClose?.(e, 'escapeKeyDown')}
                    >
                        <CloseRoundedIcon />
                    </IconButton>
                </div>
            )}
            {children}
        </MuiMenu>
    );
};

export type MenuActionTone = 'default' | 'danger';

export interface MenuActionItemProps {
    /** MUI icon shown to the left of the label. Sized 22px by the
     *  component's CSS — pass the bare icon without `fontSize`. */
    icon?: React.ReactNode;
    /** Plain text label. For richer content, use MUI's `MenuItem`
     *  directly with `.common-menu-item` as the className. */
    label: React.ReactNode;
    onClick: () => void;
    /** `default` (green hover, primary text) for navigation; `danger`
     *  (red hover, red text) for destructive actions like Logout. */
    tone?: MenuActionTone;
    /** Optional extra class merged onto the item — for one-off tweaks. */
    className?: string;
}

/**
 * Styled `MenuItem` companion for `Menu`. Owns the green-tinted hover,
 * rounded chip look, icon spacing, and danger tone used across the
 * user menu and share menu. Use the bare `MuiMenuItem` if you need
 * a child structure other than `icon + label`.
 */
export const MenuActionItem = ({
    icon,
    label,
    onClick,
    tone = 'default',
    className,
}: MenuActionItemProps) => (
    <MuiMenuItem
        onClick={onClick}
        className={classNames('common-menu-item', `tone-${tone}`, className)}
    >
        {icon}
        {label}
    </MuiMenuItem>
);

export default Menu;
