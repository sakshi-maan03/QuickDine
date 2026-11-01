// Shared rules used by several files. Changing a value here changes it everywhere.

/** Matches a 24-hour time such as "09:00" or "21:30". */
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Largest party a single booking may contain. */
export const MAX_GUESTS_PER_BOOKING = 20;

/** How much work bcrypt does when hashing a password. Higher = safer but slower. */
export const BCRYPT_ROUNDS = 12;

/** bcrypt silently ignores everything after 72 bytes, so we refuse longer passwords. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;
export const USER_ROLES = ["user", "owner", "admin"] as const;
export const RESTAURANT_STATUSES = ["pending", "approved", "rejected"] as const;
export const BOOKING_STATUSES = ["confirmed", "cancelled", "completed"] as const;
