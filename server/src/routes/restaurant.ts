import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Restaurant } from "../models/Restaurant";
import { validate, getValidated } from "../middleware/validate";

const router = Router();

const restaurantQuerySchema = z.object({
    search: z.string().trim().optional(),
    location: z.string().trim().optional(),
    cuisine: z.string().trim().optional(),
    priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

type RestaurantQuery = z.infer<typeof restaurantQuerySchema>;

const escapeRegex = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/restaurants
router.get("/", validate({ query: restaurantQuerySchema }), async (_req, res, next) => {
    try {
        const query = getValidated<{ query: RestaurantQuery }>(res).query;

        const filters: Record<string, unknown> = {
            status: "approved",
        };

        if (query.location) {
            filters.location = { $regex: escapeRegex(query.location), $options: "i" };
        }

        if (query.cuisine) {
            filters.cuisine = { $regex: escapeRegex(query.cuisine), $options: "i" };
        }

        if (query.priceRange) {
            filters.priceRange = query.priceRange;
        }

        if (query.search) {
            const search = { $regex: escapeRegex(query.search), $options: "i" };
            filters.$or = [
                { name: search },
                { cuisine: search },
                { location: search },
                { tags: search },
            ];
        }

        const skip = (query.page - 1) * query.limit;

        const [restaurants, total] = await Promise.all([
            Restaurant.find(filters)
                .select("-owner")
                .sort({ featured: -1, rating: -1 })
                .skip(skip)
                .limit(query.limit),
            Restaurant.countDocuments(filters),
        ]);

        res.json({
            success: true,
            restaurants,
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.ceil(total / query.limit),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/restaurants/slug/:slug
router.get("/slug/:slug", async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findOne({
            slug: req.params.slug,
            status: "approved",
        }).select("-owner");

        if (!restaurant) {
            res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
            return;
        }

        res.json({ success: true, restaurant });
    } catch (error) {
        next(error);
    }
});

// GET /api/restaurants/:id
router.get("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            res.status(400).json({
                success: false,
                message: "Invalid restaurant ID",
            });
            return;
        }

        const restaurant = await Restaurant.findOne({
            _id: req.params.id,
            status: "approved",
        }).select("-owner");

        if (!restaurant) {
            res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
            return;
        }

        res.json({ success: true, restaurant });
    } catch (error) {
        next(error);
    }
});

export default router;