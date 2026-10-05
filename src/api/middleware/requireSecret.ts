import { timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";

/** Whether `authorization` is `Bearer <secret>`. Constant-time so the secret can't be guessed byte by byte. */
export function isAuthorized(authorization: string | undefined, secret: string | undefined): boolean {
    if (!secret || !authorization) {
        return false;
    }
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(authorization);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Guards the Live Activity routes with the shared `INTELLINEST_API_SECRET` that the app and Home Assistant send.
 * Fails closed: with no secret configured every request is refused.
 */
export function requireSecret(req: Request, res: Response, next: NextFunction) {
    if (!isAuthorized(req.headers.authorization, process.env.INTELLINEST_API_SECRET)) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
}
