/**
 * "Need help? Let us plan the trip for you" — Pro nudge shown on the itinerary
 * page while a trip is still in Planning and essentially empty (just its
 * flight, no real activities). Clicking opens a confirm popup that stays on the
 * page (so the user doesn't lose track of the trip); on confirm the backend
 * fills the empty days with AI-suggested activities for the destination and the
 * day list refreshes in place.
 *
 * Shown to everyone as an upsell — non-Pro users are routed to /membership
 * (same paywall path the AI Trip Builder uses). The parent decides WHEN to
 * render this (Planning + organizer + empty trip); this component owns the
 * popup + the fill call only.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CircularProgress from '@mui/material/CircularProgress';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { completeTripWithAi } from 'api/aiFillItineraryApi';
import { BucketListPaywallError } from 'api/bucketListApi';
import { activeLang } from 'i18n';
import './index.scss';

export interface AiFillItineraryBoxProps {
    /** API itinerary id to fill. */
    tripId: string;
    /** Destination country name, used to personalize the copy. */
    place?: string;
    /** Pro users get the popup; everyone else is routed to the upsell. */
    isPro: boolean;
}

const AiFillItineraryBox = ({ tripId, place, isPro }: AiFillItineraryBoxProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const modalRef = useRef<ModalButtonHandle>(null);

    const fillMutation = useMutation({
        mutationFn: () => completeTripWithAi(tripId, activeLang()),
        onSuccess: () => {
            // Refetch the itinerary so the freshly-added activities show up in
            // the day list; TripDetail re-syncs its local state off this query.
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
            modalRef.current?.closeModal();
        },
        onError: (err: unknown) => {
            if (err instanceof BucketListPaywallError) {
                modalRef.current?.closeModal();
                navigate('/membership');
            }
            // Other errors fall through to the in-modal error message below.
        },
    });

    const openOrUpsell = () => {
        if (!isPro) {
            navigate('/membership');
            return;
        }
        modalRef.current?.openModel();
    };

    const errorMsg =
        fillMutation.isError &&
        !(fillMutation.error instanceof BucketListPaywallError)
            ? fillMutation.error instanceof Error
                ? fillMutation.error.message
                : t('tripDetail.aiFill.error')
            : null;

    return (
        <section className="ai-fill-box">
            <span className="ai-fill-box-icon" aria-hidden="true">
                <AutoAwesomeRoundedIcon />
            </span>
            <div className="ai-fill-box-text">
                <span className="ai-fill-box-badge">
                    {t('tripDetail.aiFill.badge')}
                </span>
                <span className="ai-fill-box-title">
                    {t('tripDetail.aiFill.needHelp')}
                </span>
                <span className="ai-fill-box-sub">
                    {place
                        ? t('tripDetail.aiFill.subWithPlace', { place })
                        : t('tripDetail.aiFill.sub')}
                </span>
            </div>
            <ButtonIcon
                className="ai-fill-box-cta"
                title={t('tripDetail.aiFill.cta')}
                Icon={ArrowForwardRoundedIcon}
                iconPosition="end"
                onClick={openOrUpsell}
            />

            <ModalButton
                ref={modalRef}
                buttonProps={null}
                title={t('tripDetail.aiFill.modalTitle')}
                containerClassName="ai-fill-modal"
                onClose={() => fillMutation.reset()}
            >
                {fillMutation.isPending ? (
                    <div className="ai-fill-modal-loading">
                        <CircularProgress size={42} thickness={4} />
                        <p className="ai-fill-modal-loading-text">
                            {place
                                ? t('tripDetail.aiFill.buildingWithPlace', {
                                      place,
                                  })
                                : t('tripDetail.aiFill.building')}
                        </p>
                        <p className="ai-fill-modal-loading-note">
                            {t('tripDetail.aiFill.buildingNote')}
                        </p>
                    </div>
                ) : (
                    <div className="ai-fill-modal-body">
                        <p className="ai-fill-modal-lede">
                            {place
                                ? t('tripDetail.aiFill.modalBodyWithPlace', {
                                      place,
                                  })
                                : t('tripDetail.aiFill.modalBody')}
                        </p>
                        <ul className="ai-fill-modal-points">
                            <li>{t('tripDetail.aiFill.point1')}</li>
                            <li>{t('tripDetail.aiFill.point2')}</li>
                            <li>{t('tripDetail.aiFill.point3')}</li>
                        </ul>
                        {errorMsg && (
                            <p className="ai-fill-modal-error" role="alert">
                                {errorMsg}
                            </p>
                        )}
                        <div className="ai-fill-modal-actions">
                            <ButtonCustom
                                type="line"
                                capitalizeType="none"
                                label={t('tripDetail.aiFill.cancel')}
                                onClick={() => modalRef.current?.closeModal()}
                            />
                            <ButtonCustom
                                type="standard"
                                capitalizeType="none"
                                className="ai-fill-modal-confirm"
                                onClick={() => fillMutation.mutate()}
                            >
                                <AutoAwesomeRoundedIcon className="ai-fill-modal-confirm-icon" />
                                <span>
                                    {errorMsg
                                        ? t('tripDetail.aiFill.retry')
                                        : t('tripDetail.aiFill.confirm')}
                                </span>
                            </ButtonCustom>
                        </div>
                    </div>
                )}
            </ModalButton>
        </section>
    );
};

export default AiFillItineraryBox;
