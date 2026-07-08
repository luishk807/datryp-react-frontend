import { useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { Autocomplete, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import CountryFlag from "components/common/CountryFlag";
import { useUser } from "context/UserContext";
import { usePassportCountry } from "hooks/usePassportCountry";
import { useUpdateMyPreferences } from "api/hooks/useMyPreferences";
import { useCountries, type CountryResult } from "api/hooks/useCountries";
import { countryName } from "utils/countryName";
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
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { data: passport, isLoading } = usePassportCountry();
  const updatePrefs = useUpdateMyPreferences();

  // Local override wins immediately when the user picks via "Change" — the
  // profile refetch (for signed-in users) catches up a beat later.
  const [override, setOverride] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const code = override ?? passport?.code ?? null;
  const detecting = !override && isLoading;
  const status = resolveVisaStatus(visa, code ?? undefined);
  const isPositive =
    status === VISA_STATUS.CITIZEN ||
    status === VISA_STATUS.VISA_FREE ||
    status === VISA_STATUS.VISA_ON_ARRIVAL;
  const name = code ? countryName(code, i18n.language) : "";

  // Full catalog, fetched only once the picker opens (lazy).
  const { data: countries = [], isFetching } = useCountries("", {
    limit: 300,
    enabled: pickerOpen,
  });

  const handlePick = (next: CountryResult | null) => {
    if (!next?.code) return;
    const cc = next.code.toUpperCase();
    setOverride(cc);
    setPickerOpen(false);
    // Persist for signed-in users so the choice follows them everywhere;
    // logged-out users get a session-only override.
    if (user) updatePrefs.mutate({ passportCountryCode: cc });
  };

  return (
    <div className={classNames("visa-widget", `status-${status}`)}>
      <div className="visa-widget-top">
        <span className="visa-widget-icon" aria-hidden="true">
          {isPositive ? <CheckCircleRoundedIcon /> : <HelpOutlineRoundedIcon />}
        </span>
        <span className="visa-widget-status">
          {detecting
            ? t("detail.common.visaWidget.detecting")
            : t(VISA_STATUS_LABEL_KEY[status])}
        </span>
      </div>

      <p className="visa-widget-passport">
        {code && (
          <>
            <CountryFlag
              code={code}
              title={name}
              className="visa-widget-flag"
            />
            <span>
              {t("detail.common.visaWidget.forPassport", { name })}
            </span>
            <span className="visa-widget-dot" aria-hidden="true">
              ·
            </span>
          </>
        )}
        <button
          type="button"
          className="visa-widget-change"
          onClick={() => setPickerOpen((o) => !o)}
          disabled={updatePrefs.isPending}
        >
          {code
            ? t("detail.common.visaWidget.change")
            : t("detail.common.visaWidget.setPassport")}
        </button>
      </p>

      {pickerOpen && (
        <Autocomplete<CountryResult>
          className="visa-widget-picker"
          size="small"
          options={countries}
          loading={isFetching}
          openOnFocus
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.code === v.code}
          onChange={(_e, next) => handlePick(next)}
          slotProps={{ popper: { sx: { zIndex: 1500 } } }}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              placeholder={t("detail.common.visaWidget.pickPassport")}
              variant="outlined"
            />
          )}
        />
      )}

      <p className="visa-widget-summary">{visa.summary}</p>
      <p className="visa-widget-disclaimer">
        {t("detail.common.visaWidget.disclaimer")}
      </p>
    </div>
  );
};

export default VisaWidget;
