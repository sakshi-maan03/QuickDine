import type { Request, RequestHandler } from "express";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { verifyToken } from "../utils/jwt";

export interface AuthenticatedRequest extends Request { authUser?: { id: string; role: string } }
export const authenticate: RequestHandler = async (req, _res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();
        const payload = verifyToken(header.slice(7));
        const user = await User.findById(payload.sub).select("name email phone role");
        if (!user) throw ApiError.unauthorized("Account no longer exists");
        (req as AuthenticatedRequest).authUser = { id: user.id, role: user.role };
        next();
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.unauthorized("Invalid or expired session. Please log in again."));
    }
};
