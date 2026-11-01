import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { BOOKING_STATUSES, MAX_GUESTS_PER_BOOKING, TIME_REGEX } from "../config/constants";
import { BOOKING_ID_REGEX, generateBookingId } from "../utils/bookingId";

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface IBooking {
    bookingId: string;
    user: Types.ObjectId;
    restaurant: Types.ObjectId;
    date: Date; // the day of the reservation, stored as midnight UTC
    time: string; // "HH:mm"
    guests: number;
    occasion: string;
    specialRequests: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    status: BookingStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type BookingDocument = HydratedDocument<IBooking>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const bookingSchema = new Schema<IBooking>(
    {
        bookingId: {
            type: String,
            unique: true,
            immutable: true, // once created, a booking reference can never change
            default: generateBookingId,
            match: [BOOKING_ID_REGEX, "Invalid booking reference"],
        },
        user: { type: Schema.Types.ObjectId, ref: "User", required: [true, "User is required"], immutable: true },
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: [true, "Restaurant is required"], immutable: true },
        date: {
            type: Date,
            required: [true, "Booking date is required"],
            validate: {
                // Dates are stored as "midnight UTC" so every booking on the same day matches exactly.
                validator: (date: Date) => date.getTime() % MS_PER_DAY === 0,
                message: "Booking date must be a whole day (midnight UTC)",
            },
        },
        time: {
            type: String,
            required: [true, "Booking time is required"],
            match: [TIME_REGEX, "Time must look like 19:30 (24-hour HH:mm)"],
        },
        guests: {
            type: Number,
            required: [true, "Number of guests is required"],
            min: [1, "At least 1 guest is required"],
            max: [MAX_GUESTS_PER_BOOKING, `A single booking cannot exceed ${MAX_GUESTS_PER_BOOKING} guests`],
            validate: { validator: Number.isInteger, message: "Guests must be a whole number" },
        },
        occasion: { type: String, trim: true, maxlength: [60, "Occasion is too long"], default: "" },
        specialRequests: { type: String, trim: true, maxlength: [500, "Special requests are too long"], default: "" },
        // The booking form asks for contact details, so we keep a copy with the booking.
        guestName: { type: String, required: [true, "Guest name is required"], trim: true, maxlength: [80, "Guest name is too long"] },
        guestEmail: {
            type: String,
            required: [true, "Guest email is required"],
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        guestPhone: {
            type: String,
            required: [true, "Guest phone is required"],
            trim: true,
            match: [/^\+?[0-9\s-]{7,18}$/, "Please provide a valid phone number"],
        },
        status: {
            type: String,
            enum: { values: BOOKING_STATUSES, message: "Status must be confirmed, cancelled or completed" },
            default: "confirmed",
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret: Record<string, unknown>) {
                delete ret.__v;
                return ret;
            },
        },
    },
);

bookingSchema.index({ user: 1, date: -1 }); // "my bookings" page
bookingSchema.index({ restaurant: 1, date: 1, time: 1 }); // owner view and availability

export const Booking = model<IBooking>("Booking", bookingSchema);
