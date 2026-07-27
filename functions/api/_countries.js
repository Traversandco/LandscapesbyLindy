// Countries offered at checkout. Stripe has no "everywhere" wildcard —
// allowed_countries must be listed explicitly. This is a broad worldwide
// list covering the destinations Royal Mail / Parcelforce deliver to.
// Delivery is free to all of them.
export const SHIPPING_COUNTRIES = [
  "GB", "IE", "US", "CA", "AU", "NZ", "ZA",
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "MC", "NL", "NO", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE", "CH",
  "AE", "AR", "BR", "CL", "CN", "CO", "HK", "IL", "IN", "JP", "KR", "MX",
  "MY", "PE", "PH", "QA", "SA", "SG", "TH", "TR", "TW", "UY", "VN",
  "BW", "EG", "GH", "KE", "MA", "MU", "NA", "NG", "TZ", "UG", "ZM", "ZW",
];
