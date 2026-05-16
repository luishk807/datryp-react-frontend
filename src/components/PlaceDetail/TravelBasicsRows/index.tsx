import LocalTaxiRoundedIcon from "@mui/icons-material/LocalTaxiRounded";
import DirectionsBusRoundedIcon from "@mui/icons-material/DirectionsBusRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import InfoRowList, {
  InfoRowListSkeleton,
  type InfoRow,
} from "components/PlaceDetail/InfoRowList";
import type { TravelBasics } from "types";

const PAYMENT_LABEL: Record<TravelBasics["paymentMethod"], string> = {
  cash: "Mostly cash",
  card: "Cards widely accepted",
  mixed: "Mixed (card + cash)",
};

export interface TravelBasicsRowsProps {
  basics: TravelBasics;
}

const TravelBasicsRows = ({ basics }: TravelBasicsRowsProps) => {
  const rows: InfoRow[] = [
    {
      icon: <LocalTaxiRoundedIcon />,
      label: "Getting around",
      value: basics.preferredTransport,
    },
    {
      icon: <DirectionsBusRoundedIcon />,
      label: "Transit system",
      value: basics.transportSystem,
    },
    {
      icon: <CreditCardRoundedIcon />,
      label: "Payment",
      value: (
        <>
          <strong>{PAYMENT_LABEL[basics.paymentMethod]}</strong>
          <span className="info-rows-sub"> — {basics.paymentNote}</span>
        </>
      ),
    },
    {
      icon: <TranslateRoundedIcon />,
      label: "Language",
      value: basics.language,
    },
    {
      icon: <CelebrationRoundedIcon />,
      label: "Vibe",
      value: basics.vibe,
    },
    {
      icon: <GroupsRoundedIcon />,
      label: "Good for",
      value: basics.audience,
    },
    {
      icon: <CakeRoundedIcon />,
      label: "Age range",
      value: basics.ageRecommendation,
    },
  ];

  return <InfoRowList rows={rows} />;
};

export const TravelBasicsSkeleton = () => <InfoRowListSkeleton rows={7} />;

export default TravelBasicsRows;
