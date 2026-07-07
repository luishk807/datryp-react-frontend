import {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import "./index.scss";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ModalButton, { type ModalButtonHandle } from "components/ModalButton";
import InputField from "components/common/FormFields/InputField";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import ErrorAlert from "components/common/ErrorAlert";
import { addDays, classifyShiftImpact, diffDays, formatDate } from "utils";
import type { TripState } from "types";

export interface ShiftDatesModalProps {
    data: TripState;
    isSaving: boolean;
    saveError?: string | null;
    /** Apply the shift + persist. Resolves `true` on success so the modal can
     *  close itself; `false` keeps it open with the error shown. Receives the
     *  chosen new start date (ISO `YYYY-MM-DD`); the parent computes the delta
     *  and does the actual shift. */
    onShift: (newStartDate: string) => Promise<boolean>;
}

// How many day-mapping rows to show before collapsing into "+N more days".
const DAY_MAP_PREVIEW_CAP = 3;

const ShiftDatesModal = forwardRef<ModalButtonHandle, ShiftDatesModalProps>(
    ({ data, isSaving, saveError = null, onShift }, ref) => {
        const { t } = useTranslation();
        const modalRef = useRef<ModalButtonHandle>(null);
        const [newStart, setNewStart] = useState<string>(data.startDate ?? "");

        useImperativeHandle(ref, () => ({
            openModel: () => {
                // Reset to the trip's current start each open so a prior
                // abandoned edit doesn't linger.
                setNewStart(data.startDate ?? "");
                modalRef.current?.openModel();
            },
            closeModal: () => modalRef.current?.closeModal(),
        }));

        const origStart = data.startDate ?? "";
        const origEnd = data.endDate ?? "";
        const delta = origStart && newStart ? diffDays(origStart, newStart) : 0;
        const newEnd = origEnd && delta ? addDays(origEnd, delta) : origEnd;
        const dayCount =
            origStart && origEnd ? diffDays(origStart, origEnd) + 1 : 0;

        const impact = useMemo(() => classifyShiftImpact(data), [data]);

        // Every itinerary day, in order — drives the old→new mapping preview.
        const dayList = useMemo(() => {
            const days: string[] = [];
            for (const dest of data.destinations ?? []) {
                for (const day of dest.itinerary ?? []) days.push(day.date);
            }
            return [...days].sort();
        }, [data]);

        const fmt = (d?: string) => (d ? formatDate(d, "MMM D, YYYY") : "");
        const fmtShort = (d?: string) => (d ? formatDate(d, "MMM D") : "");

        const handleShift = async () => {
            if (!delta) return;
            const ok = await onShift(newStart);
            if (ok) modalRef.current?.closeModal();
        };

        return (
            <ModalButton
                ref={modalRef}
                title={t("tripDetail.shift.title")}
                buttonProps={null}
                containerClassName="shift-dates-modal"
            >
                <div className="shift-dates-body">
                    <p className="shift-dates-intro">
                        {t("tripDetail.shift.intro")}
                    </p>

                    <div className="shift-dates-current">
                        {t("tripDetail.shift.current", {
                            range: `${fmt(origStart)} → ${fmt(origEnd)}`,
                        })}
                    </div>

                    <div className="shift-dates-field">
                        <InputField
                            label={t("tripDetail.shift.newStartLabel")}
                            name="newStart"
                            type="date"
                            value={newStart}
                            onChange={(e) => setNewStart(e.target.value)}
                        />
                        {dayCount > 0 && (
                            <span className="shift-dates-duration">
                                {t("tripDetail.shift.keepDuration", {
                                    count: dayCount,
                                })}
                            </span>
                        )}
                    </div>

                    {delta !== 0 ? (
                        <div className="shift-dates-preview">
                            <div className="shift-dates-newrange">
                                {t("tripDetail.shift.newRange", {
                                    start: fmt(newStart),
                                    end: fmt(newEnd),
                                })}
                            </div>

                            {dayList.length > 0 && (
                                <ul className="shift-dates-map">
                                    {dayList
                                        .slice(0, DAY_MAP_PREVIEW_CAP)
                                        .map((d) => (
                                            <li key={d}>
                                                <span>{fmtShort(d)}</span>
                                                <ArrowForwardRoundedIcon className="shift-dates-map-arrow" />
                                                <span>
                                                    {fmtShort(addDays(d, delta))}
                                                </span>
                                            </li>
                                        ))}
                                    {dayList.length > DAY_MAP_PREVIEW_CAP && (
                                        <li className="shift-dates-map-more">
                                            {t("tripDetail.shift.moreDays", {
                                                count:
                                                    dayList.length -
                                                    DAY_MAP_PREVIEW_CAP,
                                            })}
                                        </li>
                                    )}
                                </ul>
                            )}

                            <ul className="shift-dates-impact">
                                {impact.flexibleCount > 0 && (
                                    <li className="is-ok">
                                        <CheckCircleRoundedIcon className="shift-dates-impact-icon" />
                                        <span>
                                            {t("tripDetail.shift.flexibleMoves", {
                                                count: impact.flexibleCount,
                                            })}
                                        </span>
                                    </li>
                                )}
                                {impact.reservations.length > 0 && (
                                    <li className="is-warn">
                                        <WarningAmberRoundedIcon className="shift-dates-impact-icon" />
                                        <div className="shift-dates-res">
                                            <span className="shift-dates-res-head">
                                                {t(
                                                    "tripDetail.shift.reservationsHeading",
                                                    {
                                                        count: impact
                                                            .reservations.length,
                                                    },
                                                )}
                                            </span>
                                            <span className="shift-dates-res-names">
                                                {impact.reservations
                                                    .map((r) => r.name)
                                                    .join(", ")}
                                            </span>
                                            <span className="shift-dates-res-note">
                                                {t(
                                                    "tripDetail.shift.reservationsNote",
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                )}
                            </ul>

                            <p className="shift-dates-nothing">
                                {t("tripDetail.shift.nothingDeleted")}
                            </p>
                        </div>
                    ) : (
                        <p className="shift-dates-hint">
                            {t("tripDetail.shift.noChange")}
                        </p>
                    )}

                    {saveError && (
                        <ErrorAlert className="shift-dates-error">
                            {saveError}
                        </ErrorAlert>
                    )}

                    <div className="shift-dates-actions">
                        <ButtonCustom
                            type="line"
                            capitalizeType="none"
                            label={t("tripDetail.shift.cancel")}
                            onClick={() => modalRef.current?.closeModal()}
                            disabled={isSaving}
                        />
                        <ButtonCustom
                            type="standard"
                            capitalizeType="none"
                            label={
                                isSaving
                                    ? t("tripDetail.shift.saving")
                                    : t("tripDetail.shift.shift")
                            }
                            onClick={handleShift}
                            disabled={isSaving || delta === 0}
                        />
                    </div>
                </div>
            </ModalButton>
        );
    },
);

ShiftDatesModal.displayName = "ShiftDatesModal";

export default ShiftDatesModal;
