import { randomBytes } from "node:crypto";

/** Creates a customer-facing booking reference such as "QD-71B448A7". */
export function generateBookingId(): string {
    return `QD-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export const BOOKING_ID_REGEX = /^QD-[0-9A-F]{8}$/;
