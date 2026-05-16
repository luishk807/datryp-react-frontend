import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
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

const VISA_STATUS_LABEL: Record<VisaStatus, string> = {
  [VISA_STATUS.CITIZEN]: "You're a citizen",
  [VISA_STATUS.VISA_FREE]: "Visa-free entry",
  [VISA_STATUS.VISA_ON_ARRIVAL]: "Visa on arrival",
  [VISA_STATUS.VISA_REQUIRED]: "Visa required",
  [VISA_STATUS.UNKNOWN]: "Check visa requirements",
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
  const { data: user, isLoading } = useUserLocation();
  const status = resolveVisaStatus(visa, user?.countryCode);
  const isPositive =
    status === VISA_STATUS.CITIZEN ||
    status === VISA_STATUS.VISA_FREE ||
    status === VISA_STATUS.VISA_ON_ARRIVAL;
  const fromLabel = user?.country
    ? `From ${user.country}`
    : "From your location";

  return (
    <div className={classNames("visa-widget", `status-${status}`)}>
      <div className="visa-widget-top">
        <span className="visa-widget-icon" aria-hidden="true">
          {isPositive ? <CheckCircleRoundedIcon /> : <HelpOutlineRoundedIcon />}
        </span>
        <span className="visa-widget-status">
          {isLoading ? "Detecting your location…" : VISA_STATUS_LABEL[status]}
        </span>
      </div>
      <p className="visa-widget-from">{fromLabel}</p>
      <p className="visa-widget-summary">{visa.summary}</p>
      <p className="visa-widget-disclaimer">
        Verify with an official consulate before booking.
      </p>
    </div>
  );
};

export default VisaWidget;
