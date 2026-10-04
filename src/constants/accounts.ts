import {
  Banknote,
  CreditCard,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type OtherAccountType = "wallet" | "cash" | "card";

export const OTHER_ACCOUNT_KINDS: {
  type: OtherAccountType;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    type: "wallet",
    label: "Wallet",
    placeholder: "e.g. Paytm, PhonePe",
    icon: Smartphone,
    color: "#2bd4c4",
  },
  {
    type: "cash",
    label: "Cash",
    placeholder: "e.g. Cash in hand",
    icon: Banknote,
    color: "#4ece6e",
  },
  {
    type: "card",
    label: "Credit card",
    placeholder: "e.g. HDFC Millennia",
    icon: CreditCard,
    color: "#9b8cff",
  },
];
