import { createRateLimiter } from "./rateLimit";

export const signInIpLimiter = createRateLimiter(10, 60_000);
export const signInUsernameLimiter = createRateLimiter(5, 60_000);
export const deleteAccountLimiter = createRateLimiter(3, 10 * 60_000);
