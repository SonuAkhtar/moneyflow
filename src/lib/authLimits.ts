import { rateRule } from "./rateLimit";

export const signInIpLimiter = rateRule("sign-in-ip", 10, 60_000);
export const signInUsernameLimiter = rateRule("sign-in-user", 5, 60_000);
export const deleteAccountLimiter = rateRule("delete-account", 3, 10 * 60_000);
