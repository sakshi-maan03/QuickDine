import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Restaurant, SlotInventory } from "../models";
import { ApiError } from "../utils/ApiError";

const router = Router();

const dateSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
);

// GET /api/availability/:restaurantId?date=YYYY-MM-DD
router.get("/:restaurantId", async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        if (!mongoose.isValidObjectId(restaurantId)) {
            throw ApiError.badRequest("Invalid restaurant ID");
        }

        const dateResult = dateSchema.safeParse(req.query.date);

        if (!dateResult.success) {
            throw ApiError.badRequest(
                "Please provide a valid date in YYYY-MM-DD format"
            );
        }

        const dateString = dateResult.data;
        const date = new Date(`${dateString}T00:00:00.000Z`);

        // Reject impossible calendar dates such as 2026-02-30.
        if (date.toISOString().slice(0, 10) !== dateString) {
            throw ApiError.badRequest("Invalid calendar date");
        }

        const restaurant = await Restaurant.findOne({
            _id: restaurantId,
            status: "approved",
        }).select("name availableSlots totalSeats");

        if (!restaurant) {
            throw ApiError.notFound("Restaurant not found");
        }

        const inventory = await SlotInventory.find({
            restaurant: restaurant._id,
            date,
        }).select("time bookedSeats");

        const bookedSeatsByTime = new Map(
            inventory.map((item) => [item.time, item.bookedSeats])
        );

        const slots = restaurant.availableSlots.map((time) => {
            const bookedSeats = bookedSeatsByTime.get(time) ?? 0;
            const availableSeats = Math.max(
                0,
                restaurant.totalSeats - bookedSeats
            );

            return {
                time,
                totalSeats: restaurant.totalSeats,
                bookedSeats,
                availableSeats,
                available: availableSeats > 0,
            };
        });

        res.json({
            success: true,
            restaurantId: restaurant._id,
            date: dateString,
            slots,
        });
    } catch (error) {
        next(error);
    }
});

export default router;