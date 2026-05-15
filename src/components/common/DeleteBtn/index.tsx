import './index.scss';
import DialogBox from 'components/common/FormFields/DialogBox';
import { BUTTON_VARIANT } from 'constants';

type DeleteBtnVariant = typeof BUTTON_VARIANT.TEXT | typeof BUTTON_VARIANT.STANDARD;

export interface DeleteBtnProps {
    title?: string;
    label?: string;
    targetName?: string;
    onConfirm?: () => void;
    buttonType?: DeleteBtnVariant;
    isViewMode?: boolean;
}

const DeleteBtn = ({
    title = 'Delete this item',
    label = 'Delete',
    targetName,
    onConfirm,
    buttonType = BUTTON_VARIANT.TEXT,
    isViewMode = false,
}: DeleteBtnProps) => {
    return (
        <DialogBox
            title={title}
            buttonLabel={label}
            buttonType={buttonType}
            onConfirm={onConfirm}
            isViewMode={isViewMode}
        >
            You are about to delete {targetName ?? 'this item'}. Are you sure you want to delete it?
        </DialogBox>
    );
};

export default DeleteBtn;
