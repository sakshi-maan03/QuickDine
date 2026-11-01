import bcrypt from "bcryptjs";
import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import { BCRYPT_ROUNDS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_ROLES } from "../config/constants";

export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
    name: string;
    email: string;
    phone?: string;
    password: string; // always stored as a bcrypt hash, never as plain text
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

interface IUserMethods {
    comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [80, "Name cannot be longer than 80 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true, // two accounts cannot share an email
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        phone: {
            type: String,
            trim: true,
            match: [/^\+?[0-9\s-]{7,18}$/, "Please provide a valid phone number"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`],
            maxlength: [PASSWORD_MAX_LENGTH, `Password cannot be longer than ${PASSWORD_MAX_LENGTH} characters`],
            select: false, // queries do NOT return the hash unless you explicitly ask for it
        },
        role: {
            type: String,
            enum: { values: USER_ROLES, message: "Role must be user, owner or admin" },
            default: "user",
        },
    },
    {
        timestamps: true,
        toJSON: {
            // Whatever happens, the password hash never leaves the server inside a JSON response.
            transform(_doc, ret: Record<string, unknown>) {
                delete ret.password;
                delete ret.__v;
                return ret;
            },
        },
    },
);

// Runs automatically before every save: hash the password if it was set or changed.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.method("comparePassword", async function (candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
});

export const User = model<IUser, UserModel>("User", userSchema);
