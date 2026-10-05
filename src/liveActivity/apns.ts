import apn, { Notification, Provider, Responses } from "@parse/node-apn";

const bundleID = "se.laross.IntelliNest";

const createApnProvider = (isProduction: boolean): Provider => {
    return new apn.Provider({
        token: {
            key: process.env.APNS_KEY_PATH || "",
            keyId: process.env.APNS_KEY_ID || "",
            teamId: process.env.APNS_TEAM_ID || "",
        },
        production: isProduction,
    });
};

/**
 * Sends to production first and retries on the sandbox gateway when APNs rejects the token, since debug builds
 * from Xcode get sandbox tokens. Same fallback as `/notify`.
 */
export async function sendWithEnvironmentFallback(notification: Notification, token: string): Promise<Responses> {
    const production = createApnProvider(true);
    try {
        const result = await production.send(notification, token);
        if (!result.failed.some((failure) => failure.response?.reason === "BadDeviceToken")) {
            return result;
        }
    } finally {
        production.shutdown();
    }
    const sandbox = createApnProvider(false);
    try {
        return await sandbox.send(notification, token);
    } finally {
        sandbox.shutdown();
    }
}

export function liveActivityNotification(payload: object, priority: number): Notification {
    const notification = new apn.Notification();
    notification.topic = `${bundleID}.push-type.liveactivity`;
    // The typings predate Live Activities; APNs only needs the header value.
    notification.pushType = "liveactivity" as Notification["pushType"];
    notification.priority = priority;
    notification.rawPayload = payload;
    return notification;
}

/** Wakes the app in the background so it can fetch the new track's album art into the activity. */
export function artworkRefreshNotification(): Notification {
    const notification = new apn.Notification();
    notification.topic = bundleID;
    notification.pushType = "background";
    notification.priority = 5;
    notification.contentAvailable = true;
    notification.payload = { intellinest: "live-activity-refresh" };
    return notification;
}
