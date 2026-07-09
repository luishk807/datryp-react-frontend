import React, {
    forwardRef,
    useId,
    useImperativeHandle,
    useState,
    type ComponentType,
    type CSSProperties,
    type ReactNode,
} from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { IconButton, Modal } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import type { BUTTON_VARIANT } from 'constants';

export interface ModalButtonHandle {
    openModel: () => void;
    closeModal: () => void;
}

export interface ModalButtonButtonProps {
    title?: string;
    Icon?: ComponentType<any> | null;
    style?: CSSProperties;
    type?:
        | typeof BUTTON_VARIANT.TEXT
        | typeof BUTTON_VARIANT.STANDARD
        | typeof BUTTON_VARIANT.TEXT_PLAIN;
    isViewMode?: boolean;
    /** Optional extra class on the trigger — used by icon-only triggers
     *  that want compact, IconButton-style padding. */
    className?: string;
    /** Props forwarded to the icon component (e.g. `fontSize: 'small'`). */
    iconProps?: Record<string, unknown>;
    /** Accessible label for icon-only triggers where `title` is empty. */
    ariaLabel?: string;
}

export interface ModalButtonProps {
    title?: string;
    children?: ReactNode;
    buttonProps?: ModalButtonButtonProps | null;
    /** Optional control rendered in the header's top-right, just before
     *  the X close button. Lets a consumer place a compact secondary
     *  affordance (e.g. AddPlaceBtn's review "Edit" pencil) up in the
     *  title row instead of crowding the footer. */
    headerAction?: ReactNode;
    /** Fires whenever the modal closes — backdrop click, escape, the X
     *  button, or a programmatic `closeModal()` from the ref. Use this to
     *  clean up transient form state that should not survive a dismissal. */
    onClose?: () => void;
    /** Fires whenever the modal opens — the trigger button or a
     *  programmatic `openModel()`. Use it to pre-warm data the modal will
     *  need (e.g. prefetch suggestions) so the content is ready on arrival. */
    onOpen?: () => void;
    /** Optional extra class on the modal container (`.modalCustom`).
     *  Lets a specific consumer scope its own size / shape overrides —
     *  for example, AddPlaceBtn flips its modal to a full-viewport
     *  sheet on mobile without affecting other modals. */
    containerClassName?: string;
}

const ModalButton = forwardRef<ModalButtonHandle, ModalButtonProps>(
    (
        {
            title = '',
            children = null,
            buttonProps = null,
            headerAction = null,
            onClose,
            onOpen,
            containerClassName,
        },
        ref
    ) => {
        const { t } = useTranslation();
        const [open, setOpen] = useState(false);
        // Unique per instance — a hard-coded id collides (breaking
        // aria-labelledby) whenever two ModalButtons mount at once.
        const titleId = useId();
        const handleOpen = () => {
            setOpen(true);
            onOpen?.();
        };
        const handleClose = () => {
            setOpen(false);
            onClose?.();
        };

        useImperativeHandle(ref, () => ({
            openModel: handleOpen,
            closeModal: handleClose,
        }));

        return (
            <>
                {buttonProps && <ButtonIcon onClick={handleOpen} {...buttonProps} />}

                <Modal
                    open={open}
                    onClose={handleClose}
                    aria-labelledby={titleId}
                >
                    <div
                        className={classNames('modalCustom', containerClassName)}
                        // React's synthetic events bubble through the
                        // fiber tree, not the DOM tree — so a keystroke
                        // inside a portaled modal still reaches the
                        // React parent that opened it. dnd-kit's
                        // KeyboardSensor (mounted on the activity card
                        // wrapper in DestinationDetail) was picking up
                        // Enter from inside AddBudget / AddPlaceBtn
                        // modals and starting a drag that never
                        // resolved, leaving the day's drop-target
                        // highlight stuck on until a browser refresh.
                        // Containing keyboard events at the modal seam
                        // is the cleanest place to break that — every
                        // ModalButton-based modal gets the fix.
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <span className="modalCustom-stripe" aria-hidden="true" />
                        <div className="modalCustom-header">
                            <h2 id={titleId} className="modalCustom-title">
                                {title}
                            </h2>
                            {headerAction && (
                                <div className="modalCustom-header-action">
                                    {headerAction}
                                </div>
                            )}
                            <IconButton
                                className="modalCustom-close"
                                aria-label={t('common.close')}
                                onClick={handleClose}
                            >
                                <CloseRoundedIcon />
                            </IconButton>
                        </div>
                        <div className="modalCustom-content">{children}</div>
                    </div>
                </Modal>
            </>
        );
    }
);

ModalButton.displayName = 'ModalButton';

export default ModalButton;
