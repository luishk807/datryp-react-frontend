import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import { useUserLocation } from "hooks/useUserLocation";
import type { VisaInfo } from "types";
import "./index.scss";

const VISA_STATUS = {
  CITIZEN: "citizen",
  VISA_FREE: "visa-free",
  VISA_ON_ARRIVAL: "visa-on-arrival",
  VISA_REQUIRED: "visa-required",
  UNKNOWN: "unknown",
} as const;

type VisaStatus = (typeof VISA_STATUS)[keyof typeof VISA_STATUS];

const VISA_STATUS_LABEL_KEY: Record<VisaStatus, string> = {
  [VISA_STATUS.CITIZEN]: "detail.common.visaWidget.citizen",
  [VISA_STATUS.VISA_FREE]: "detail.common.visaWidget.visaFree",
  [VISA_STATUS.VISA_ON_ARRIVAL]: "detail.common.visaWidget.onArrival",
  [VISA_STATUS.VISA_REQUIRED]: "detail.common.visaWidget.required",
  [VISA_STATUS.UNKNOWN]: "detail.common.visaWidget.unknown",
};

const resolveVisaStatus = (
  visa: VisaInfo,
  userCountryCode: string | undefined,
): VisaStatus => {
  if (!userCountryCode) return VISA_STATUS.UNKNOWN;
  const u = userCountryCode.toUpperCase();
  const dest = visa.destinationCountryCode.toUpperCase();
  if (u === dest) return VISA_STATUS.CITIZEN;
  if (visa.visaFreeCountries.map((c) => c.toUpperCase()).includes(u))
    return VISA_STATUS.VISA_FREE;
  if (visa.visaOnArrivalCountries.map((c) => c.toUpperCase()).includes(u))
    return VISA_STATUS.VISA_ON_ARRIVAL;
  return VISA_STATUS.VISA_REQUIRED;
};

export interface VisaWidgetProps {
  visa: VisaInfo;
}

const VisaWidget = ({ visa }: VisaWidgetProps) => {
  const { t } = useTranslation();
  const { data: user, isLoading } = useUserLocation();
  const status = resolveVisaStatus(visa, user?.countryCode);
  const isPositive =
    status === VISA_STATUS.CITIZEN ||
    status === VISA_STATUS.VISA_FREE ||
    status === VISA_STATUS.VISA_ON_ARRIVAL;
  const fromLabel = user?.country
    ? t('detail.common.visaWidget.from', { name: user.country })
    : t('detail.common.visaWidget.fromYourLocation');

  return (
    <div className={classNames("visa-widget", `status-${status}`)}>
      <div className="visa-widget-top">
        <span className="visa-widget-icon" aria-hidden="true">
          {isPositive ? <CheckCircleRoundedIcon /> : <HelpOutlineRoundedIcon />}
        </span>
        <span className="visa-widget-status">
          {isLoading
            ? t('detail.common.visaWidget.detecting')
            : t(VISA_STATUS_LABEL_KEY[status])}
        </span>
      </div>
      <p className="visa-widget-from">{fromLabel}</p>
      <p className="visa-widget-summary">{visa.summary}</p>
      <p className="visa-widget-disclaimer">
        {t('detail.common.visaWidget.disclaimer')}
      </p>
    </div>
  );
};

export default VisaWidget;
