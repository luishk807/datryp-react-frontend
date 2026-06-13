/**
 * Step 8 — Bucket list. Free-text travel goals; each row POSTs through
 * the server's moderation gate (drugs / self-harm / weapons are caught
 * before persistence). Finishing this step flips
 * `onboarding_completed_at` and exits to `/`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { IconButton } from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BucketListBlockedError } from 'api/bucketListApi';
import {
    useAddBucketListItem,
    useBucketList,
    useDeleteBucketListItem,
} from 'api/hooks/useBucketList';
import './index.scss';

export interface StepBucketListProps {
    onFinish: () => void;
    onSkip: () => void;
}

const StepBucketList = ({ onFinish, onSkip }: StepBucketListProps) => {
    const { t } = useTranslation();
    const { data: items = [] } = useBucketList();
    const add = useAddBucketListItem();
    const remove = useDeleteBucketListItem();
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        const text = draft.trim();
        if (!text) return;
        setError(null);
        try {
            await add.mutateAsync(text);
            setDraft('');
        } catch (err) {
            if (err instanceof BucketListBlockedError) {
                setError(err.message);
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : t('auth.signup.bucket.addError')
                );
            }
        }
    };

    return (
        <>
            <h1 className="signup-step-title">{t('auth.signup.bucket.title')}</h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.bucket.subtitle')}
            </p>

            <div className="signup-bucket-add">
                <input
                    className="signup-step-input"
                    type="text"
                    placeholder={t('auth.signup.bucket.placeholder')}
                    value={draft}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        if (error) setError(null);
                    }}
                    maxLength={280}
                />
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn signup-bucket-add-btn"
                    label={
                        add.isPending
                            ? t('common.saving')
                            : t('auth.signup.bucket.add')
                    }
                    onClick={handleAdd}
                    disabled={add.isPending || !draft.trim()}
                />
            </div>

            {items.length > 0 && (
                <ul className="signup-bucket-list">
                    {items.map((item) => (
                        <li key={item.id} className="signup-bucket-row">
                            <span>{item.text}</span>
                            <IconButton
                                size="small"
                                aria-label={t('auth.signup.bucket.removeAria', {
                                    text: item.text,
                                })}
                                onClick={() => void remove.mutateAsync(item.id)}
                            >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                        </li>
                    ))}
                </ul>
            )}

            {error && (
                <p className="signup-error" role="alert">
                    {error}
                </p>
            )}

            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={t('auth.signup.bucket.finish')}
                    onClick={onFinish}
                />
                <button
                    type="button"
                    className="signup-skip-link"
                    onClick={onSkip}
                >
                    {t('auth.signup.skipRest')}
                </button>
            </div>
        </>
    );
};

export default StepBucketList;
