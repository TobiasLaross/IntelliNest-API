import { Request, Response } from "express";
import { applyMediaPlayerEvent, ContentState, MediaPlayerEvent } from "../../liveActivity/contentState";
import {
    artworkRefreshNotification,
    liveActivityNotification,
    sendWithEnvironmentFallback,
} from "../../liveActivity/apns";

interface Registration {
    activityPushToken: string;
    deviceToken: string | null;
    state: ContentState;
    volumes: Map<string, number>;
}

/**
 * The running music Live Activities, keyed by their ActivityKit push token. Kept in memory: the app registers
 * again whenever it updates the activity, so a restart only loses updates until the app is next opened.
 */
const registrations = new Map<string, Registration>();

function isContentState(value: unknown): value is ContentState {
    const state = value as ContentState | null;
    return (
        typeof state?.title === "string" &&
        typeof state.transportTargetID === "string" &&
        Array.isArray(state.volumeSpeakerIDs) &&
        typeof state.groupVolume === "number"
    );
}

function handleRegister(req: Request, res: Response) {
    const activityPushToken = req.body?.push_token;
    const state = req.body?.content_state;
    if (typeof activityPushToken !== "string" || !isContentState(state)) {
        return res.status(400).json({ message: "push_token and content_state are required" });
    }
    const deviceToken = typeof req.body?.device_token === "string" ? req.body.device_token : null;
    const existing = registrations.get(activityPushToken);
    registrations.set(activityPushToken, {
        activityPushToken,
        deviceToken,
        state,
        volumes: existing?.volumes ?? new Map(),
    });
    return res.json({ message: "Registered" });
}

function handleUnregister(req: Request, res: Response) {
    registrations.delete(req.body?.push_token);
    return res.json({ message: "Unregistered" });
}

async function handleMediaState(req: Request, res: Response) {
    const event = req.body as MediaPlayerEvent;
    if (typeof event?.entity_id !== "string" || typeof event.state !== "string") {
        return res.status(400).json({ message: "entity_id and state are required" });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const sends: Promise<unknown>[] = [];
    for (const registration of registrations.values()) {
        const change = applyMediaPlayerEvent(registration.state, registration.volumes, event);
        if (change.kind === "none") {
            continue;
        }
        if (change.kind === "end") {
            registrations.delete(registration.activityPushToken);
            const payload = {
                aps: { timestamp, event: "end", "content-state": registration.state, "dismissal-date": timestamp },
            };
            sends.push(send(liveActivityNotification(payload, 10), registration.activityPushToken));
            continue;
        }
        registration.state = change.state;
        const payload = { aps: { timestamp, event: "update", "content-state": change.state } };
        // A volume or position nudge isn't worth spending the high-priority budget iOS gives each activity.
        const priority = change.trackChanged || change.playbackChanged ? 10 : 5;
        sends.push(send(liveActivityNotification(payload, priority), registration.activityPushToken));
        if (change.trackChanged && registration.deviceToken) {
            sends.push(send(artworkRefreshNotification(), registration.deviceToken));
        }
    }
    await Promise.all(sends);
    return res.json({ message: "OK", activities: registrations.size });
}

async function send(notification: Parameters<typeof sendWithEnvironmentFallback>[0], token: string) {
    try {
        const result = await sendWithEnvironmentFallback(notification, token);
        result.failed.forEach((failure) => {
            console.error(new Date().toISOString(), "Live Activity push failed:", JSON.stringify(failure.response));
            if (failure.response?.reason === "ExpiredToken" || failure.response?.reason === "Unregistered") {
                registrations.delete(token);
            }
        });
    } catch (error) {
        console.error(new Date().toISOString(), "Exception sending Live Activity push:", error);
    }
}

const liveActivity = {
    handleRegister,
    handleUnregister,
    handleMediaState,
};

export default liveActivity;
