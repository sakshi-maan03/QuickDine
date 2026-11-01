import { Schema, model, type Types } from "mongoose";
import { TIME_REGEX } from "../config/constants";

/**
 * Internal bookkeeping: how many seats are already taken for one restaurant,
 * on one date, at one time. Step 4 updates this with a single atomic operation
 * so two people can never grab the last seats at the same moment.
 * This collection is never sent to the frontend.
 */
export interface ISlotInventory {
    restaurant: Types.ObjectId;
    date: Date;
    time: string;
    bookedSeats: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const slotInventorySchema = new Schema<ISlotInventory>(
    {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
        date: {
            type: Date,
            required: true,
            validate: { validator: (date: Date) => date.getTime() % MS_PER_DAY === 0, message: "Date must be midnight UTC" },
        },
        time: { type: String, required: true, match: [TIME_REGEX, "Time must look like 19:30"] },
        bookedSeats: {
            type: Number,
            required: true,
            min: [0, "Booked seats cannot be negative"],
            default: 0,
            validate: { validator: Number.isInteger, message: "Booked seats must be a whole number" },
        },
    },
    { timestamps: true },
);

// One record per restaurant + date + time. The database itself enforces this.
slotInventorySchema.index({ restaurant: 1, date: 1, time: 1 }, { unique: true });

export const SlotInventory = model<ISlotInventory>("SlotInventory", slotInventorySchema);
