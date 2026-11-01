import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { PRICE_RANGES, RESTAURANT_STATUSES, TIME_REGEX } from "../config/constants";
import { slugify } from "../utils/slugify";

export type PriceRange = (typeof PRICE_RANGES)[number];
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

export interface IRestaurant {
    name: string;
    slug: string;
    description: string;
    cuisine: string;
    priceRange: PriceRange;
    rating: number;
    reviewCount: number;
    location: string;
    address: string;
    image: string;
    chef: string;
    tags: string[];
    availableSlots: string[];
    totalSeats: number;
    featured: boolean;
    exclusive: boolean;
    owner: Types.ObjectId;
    status: RestaurantStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type RestaurantDocument = HydratedDocument<IRestaurant>;

const restaurantSchema = new Schema<IRestaurant>(
    {
        name: {
            type: String,
            required: [true, "Restaurant name is required"],
            trim: true,
            minlength: [2, "Restaurant name must be at least 2 characters"],
            maxlength: [100, "Restaurant name cannot be longer than 100 characters"],
        },
        // The slug is the readable part of the page address: /restaurant/amrik-sukhdev
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and dashes"],
        },
        description: { type: String, trim: true, maxlength: [2000, "Description is too long"], default: "" },
        cuisine: {
            type: String,
            required: [true, "Cuisine is required"],
            trim: true,
            maxlength: [60, "Cuisine is too long"],
        },
        priceRange: {
            type: String,
            enum: { values: PRICE_RANGES, message: "Price range must be $, $$, $$$ or $$$$" },
            default: "$$",
        },
        rating: { type: Number, min: [0, "Rating cannot be below 0"], max: [5, "Rating cannot be above 5"], default: 0 },
        reviewCount: { type: Number, min: [0, "Review count cannot be negative"], default: 0 },
        location: { type: String, required: [true, "Location is required"], trim: true, maxlength: [120, "Location is too long"] },
        address: { type: String, required: [true, "Address is required"], trim: true, maxlength: [300, "Address is too long"] },
        image: { type: String, trim: true, default: "" },
        chef: { type: String, trim: true, maxlength: [100, "Chef name is too long"], default: "" },
        tags: {
            type: [{ type: String, trim: true, maxlength: 40 }],
            validate: { validator: (tags: string[]) => tags.length <= 15, message: "A restaurant can have at most 15 tags" },
            default: [],
        },
        availableSlots: {
            type: [String],
            // Remove duplicates and keep the times in order: ["19:00","18:00","18:00"] → ["18:00","19:00"]
            set: (slots: string[]) => [...new Set(slots)].sort(),
            validate: [
                { validator: (slots: string[]) => slots.length > 0, message: "Choose at least one available time slot" },
                {
                    validator: (slots: string[]) => slots.every((slot) => TIME_REGEX.test(slot)),
                    message: "Time slots must look like 18:30 (24-hour HH:mm)",
                },
            ],
        },
        totalSeats: {
            type: Number,
            required: [true, "Total seats is required"],
            min: [1, "A restaurant needs at least 1 seat"],
            max: [1000, "Total seats cannot be more than 1000"],
            validate: { validator: Number.isInteger, message: "Total seats must be a whole number" },
        },
        featured: { type: Boolean, default: false },
        exclusive: { type: Boolean, default: false },
        // Each owner can run exactly one restaurant (that is how the owner dashboard works).
        owner: { type: Schema.Types.ObjectId, ref: "User", required: [true, "Owner is required"], unique: true },
        status: {
            type: String,
            enum: { values: RESTAURANT_STATUSES, message: "Status must be pending, approved or rejected" },
            default: "pending", // new restaurants wait for an admin to approve them
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

// Indexes make common searches fast.
restaurantSchema.index({ status: 1, cuisine: 1, priceRange: 1 });
restaurantSchema.index({ status: 1, featured: 1 });
restaurantSchema.index({ name: "text", cuisine: "text", location: "text", tags: "text" });

// Before validating, create a slug from the name if there isn't one yet.
// If "pizza-place" is taken we try "pizza-place-2", "pizza-place-3", and so on.
restaurantSchema.pre("validate", async function () {
    if (this.slug || !this.name) return;

    const RestaurantModel = this.constructor as Model<IRestaurant>;
    const base = slugify(this.name);
    let candidate = base;
    let counter = 1;

    while (await RestaurantModel.exists({ slug: candidate, _id: { $ne: this._id } })) {
        counter += 1;
        candidate = `${base}-${counter}`;
    }
    this.slug = candidate;
});

export const Restaurant = model<IRestaurant>("Restaurant", restaurantSchema);
