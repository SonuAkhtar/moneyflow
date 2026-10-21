export interface CurrencyOption {
  code: string;
  label: string;
  locale: string;
  regions: string[];
}

export const CURRENCIES: CurrencyOption[] = [
  {
    code: "INR",
    label: "₹ Indian Rupee (INR)",
    locale: "en-IN",
    regions: ["IN"],
  },
  { code: "USD", label: "$ US Dollar (USD)", locale: "en-US", regions: ["US"] },
  {
    code: "EUR",
    label: "€ Euro (EUR)",
    locale: "en-IE",
    regions: ["DE", "FR", "ES", "IT", "NL", "IE", "PT", "BE", "AT", "FI", "GR"],
  },
  {
    code: "GBP",
    label: "£ British Pound (GBP)",
    locale: "en-GB",
    regions: ["GB"],
  },
  {
    code: "AED",
    label: "د.إ UAE Dirham (AED)",
    locale: "en-AE",
    regions: ["AE"],
  },
  {
    code: "AUD",
    label: "$ Australian Dollar (AUD)",
    locale: "en-AU",
    regions: ["AU"],
  },
  {
    code: "CAD",
    label: "$ Canadian Dollar (CAD)",
    locale: "en-CA",
    regions: ["CA"],
  },
  {
    code: "JPY",
    label: "¥ Japanese Yen (JPY)",
    locale: "ja-JP",
    regions: ["JP"],
  },
  {
    code: "SGD",
    label: "$ Singapore Dollar (SGD)",
    locale: "en-SG",
    regions: ["SG"],
  },
];

export const CURRENCY_SELECT_OPTIONS = CURRENCIES.map((c) => ({
  label: c.label,
  value: c.code,
}));

export const localeForCurrency = (code: string): string =>
  CURRENCIES.find((c) => c.code === code)?.locale ?? "en-US";

export const guessCurrency = (
  languages: readonly string[] | undefined,
  fallback = "INR",
): string => {
  for (const lang of languages ?? []) {
    const region = lang.split("-")[1]?.toUpperCase();
    if (!region) continue;
    const match = CURRENCIES.find((c) => c.regions.includes(region));
    if (match) return match.code;
  }
  return fallback;
};
