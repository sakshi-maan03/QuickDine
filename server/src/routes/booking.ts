import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { Booking, Restaurant, SlotInventory } from "../models";
import {
    authenticate,
    type AuthenticatedRequest,
} from "../middleware/authenticate";
import { ApiError } from "../utils/ApiError";
import {
    MAX_GUESTS_PER_BOOKING,
    TIME_REGEX,
} from "../config/constants";

const router = Router();

const bookingSchema = z.object({
    restaurantId: z.string().refine(
        (value) => mongoose.isValidObjectId(value),
        "Invalid restaurant ID"
    ),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(TIME_REGEX),
    guests: z.number().int().min(1).max(MAX_GUESTS_PER_BOOKING),
    occasion: z.string().max(60).optional().default(""),
    specialRequests: z.string().max(500).optional().default(""),
    guestName: z.string().trim().min(1).max(80),
    guestEmail: z.string().trim().email().max(254),
    guestPhone: z.string().trim().regex(/^\+?[0-9\s-]{7,18}$/),
});

// GET /api/bookings
// Get all bookings belonging to the logged-in user.
router.get("/", authenticate, async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.authUser?.id;

        if (!userId) {
            throw ApiError.unauthorized();
        }

        const bookings = await Booking.find({ user: userId })
            .populate(
                "restaurant",
                "name slug image cuisine location address"
            )
            .sort({ date: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            bookings,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/bookings
// Create a new reservation.
router.post("/", authenticate, async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const parsed = bookingSchema.safeParse(req.body);

        if (!parsed.success) {
            throw ApiError.badRequest("Invalid booking details");
        }

        // const data = parsed.data;
        // const date = new Date(`${data.date}T00:00:00.000Z`);

        // if (date.toISOString().slice(0, 10) !== data.date) {
        //     throw ApiError.badRequest("Invalid booking date");
        // }
        const data = parsed.data;

const date = new Date(`${data.date}T00:00:00.000Z`);

if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== data.date
) {
    throw ApiError.badRequest("Invalid booking date");
}

// Get the current date and time in Indian Standard Time.
const now = new Date();

const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(now);

const indiaTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
}).format(now);

// Reject reservations for past dates.
if (data.date < indiaDate) {
    throw ApiError.badRequest(
        "You cannot book a reservation for a past date."
    );
}

// Reject time slots that have already passed today.
if (data.date === indiaDate && data.time <= indiaTime) {
    throw ApiError.badRequest(
        "This reservation time has already passed. Please select another slot."
    );
}

        const authReq = req as AuthenticatedRequest;
        const userId = authReq.authUser?.id;

        if (!userId) {
            throw ApiError.unauthorized();
        }

        let createdBooking: any;

        await session.withTransaction(async () => {
            const restaurant = await Restaurant.findOne({
                _id: data.restaurantId,
                status: "approved",
            }).session(session);

            if (!restaurant) {
                throw ApiError.notFound("Restaurant not found");
            }

            if (!restaurant.availableSlots.includes(data.time)) {
                throw ApiError.badRequest(
                    "This time slot is not available at this restaurant"
                );
            }

            await SlotInventory.updateOne(
                {
                    restaurant: restaurant._id,
                    date,
                    time: data.time,
                },
                {
                    $setOnInsert: {
                        restaurant: restaurant._id,
                        date,
                        time: data.time,
                        bookedSeats: 0,
                    },
                },
                {
                    upsert: true,
                    session,
                }
            );

            const inventoryUpdate = await SlotInventory.updateOne(
                {
                    restaurant: restaurant._id,
                    date,
                    time: data.time,
                    bookedSeats: {
                        $lte: restaurant.totalSeats - data.guests,
                    },
                },
                {
                    $inc: {
                        bookedSeats: data.guests,
                    },
                },
                { session }
            );

            if (inventoryUpdate.modifiedCount !== 1) {
                throw ApiError.conflict(
                    "Sorry, not enough seats are available for this time slot"
                );
            }

            const [booking] = await Booking.create(
                [
                    {
                        user: userId,
                        restaurant: restaurant._id,
                        date,
                        time: data.time,
                        guests: data.guests,
                        occasion: data.occasion,
                        specialRequests: data.specialRequests,
                        guestName: data.guestName,
                        guestEmail: data.guestEmail,
                        guestPhone: data.guestPhone,
                        status: "confirmed",
                    },
                ],
                { session }
            );

            createdBooking = booking;
        });

        res.status(201).json({
            success: true,
            message: "Reservation confirmed successfully",
            booking: createdBooking,
        });
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
});

// DELETE /api/bookings/:bookingId
// Cancel a booking and release its reserved seats.
router.delete("/:bookingId", authenticate, async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.authUser?.id;
        const bookingId = req.params.bookingId;

        if (!userId) {
            throw ApiError.unauthorized();
        }

        if (!mongoose.isValidObjectId(bookingId)) {
            throw ApiError.badRequest("Invalid booking ID");
        }

        await session.withTransaction(async () => {
            const booking = await Booking.findOne({
                _id: bookingId,
                user: userId,
                status: "confirmed",
            }).session(session);

            if (!booking) {
                throw ApiError.notFound(
                    "Booking not found or already cancelled"
                );
            }

            const inventoryUpdate = await SlotInventory.updateOne(
                {
                    restaurant: booking.restaurant,
                    date: booking.date,
                    time: booking.time,
                    bookedSeats: { $gte: booking.guests },
                },
                {
                    $inc: {
                        bookedSeats: -booking.guests,
                    },
                },
                { session }
            );

            if (inventoryUpdate.modifiedCount !== 1) {
                throw ApiError.conflict(
                    "Unable to release reserved seats."
                );
            }

            booking.status = "cancelled";
            await booking.save({ session });
        });

        res.status(200).json({
            success: true,
            message: "Reservation cancelled successfully",
        });
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
});

export default router;