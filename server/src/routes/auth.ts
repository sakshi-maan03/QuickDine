import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { signToken } from "../utils/jwt";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { validate, getValidated } from "../middleware/validate";

const router = Router();
const registerSchema = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
    phone: z.string().trim().optional().or(z.literal("")),
    role: z.enum(["user", "owner"]).optional().default("user"),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(72) });
type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
const publicUser = (user: { id: string; name: string; email: string; phone?: string; role: string }) => ({
    _id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
});

router.post("/register", validate({ body: registerSchema }), async (_req, res, next) => {
    try {
        const body = getValidated<{ body: RegisterInput }>(res).body;
        const user = await User.create({ ...body, email: body.email.toLowerCase(), ...(body.phone ? { phone: body.phone } : {}) });
        res.status(201).json({ success: true, token: signToken(user.id, user.role), user: publicUser(user) });
    } catch (error) { next(error); }
});

router.post("/login", validate({ body: loginSchema }), async (_req, res, next) => {
    try {
        const body = getValidated<{ body: LoginInput }>(res).body;
        const user = await User.findOne({ email: body.email.toLowerCase() }).select("+password");
        if (!user || !(await user.comparePassword(body.password))) throw ApiError.unauthorized("Incorrect email or password");
        res.json({ success: true, token: signToken(user.id, user.role), user: publicUser(user) });
    } catch (error) { next(error); }
});

router.get("/me", authenticate, async (req, res, next) => {
    try {
        const id = (req as AuthenticatedRequest).authUser!.id;
        const user = await User.findById(id).select("name email phone role");
        if (!user) throw ApiError.unauthorized();
        res.json({ success: true, user: publicUser(user) });
    } catch (error) { next(error); }
});
export default router;
