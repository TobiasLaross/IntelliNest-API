/**
 * Mirrors `MusicActivityAttributes.ContentState` in the IntelliNest app. ActivityKit decodes the pushed
 * `content-state` with a default `JSONDecoder`, so dates are seconds since 2001-01-01 (Apple's reference date),
 * not Unix time.
 */
export interface ContentState {
    title: string;
    artist?: string | null;
    roomName: string;
    isPlaying: boolean;
    position?: number | null;
    positionDate?: number | null;
    duration?: number | null;
    groupVolume: number;
    artworkFileName?: string | null;
    transportTargetID: string;
    volumeSpeakerIDs: string[];
}

/** A Home Assistant `media_player` state as the `intellinest_media_state` automation forwards it. */
export interface MediaPlayerEvent {
    entity_id: string;
    state: string;
    attributes?: Record<string, unknown>;
}

export type Change =
    | { kind: "none" }
    | { kind: "end" }
    | { kind: "update"; state: ContentState; trackChanged: boolean; playbackChanged: boolean };

const appleReferenceDateOffsetSeconds = 978_307_200;

export function toAppleReferenceSeconds(isoDate: string): number | null {
    const milliseconds = Date.parse(isoDate);
    if (Number.isNaN(milliseconds)) {
        return null;
    }
    return milliseconds / 1000 - appleReferenceDateOffsetSeconds;
}

const endedStates = new Set(["idle", "off", "standby", "unavailable", "unknown"]);

function optionalNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Works out what a Home Assistant state change means for a running activity. `volumes` holds the latest known
 * volume per grouped speaker and is updated in place, so the group average stays right as members change one by
 * one.
 */
export function applyMediaPlayerEvent(
    current: ContentState,
    volumes: Map<string, number>,
    event: MediaPlayerEvent,
): Change {
    const attributes = event.attributes ?? {};
    let next: ContentState = { ...current };

    if (current.volumeSpeakerIDs.includes(event.entity_id)) {
        const volume = optionalNumber(attributes["volume_level"]);
        if (volume !== null) {
            volumes.set(event.entity_id, volume);
            const known = current.volumeSpeakerIDs
                .map((speakerID) => volumes.get(speakerID))
                .filter((level): level is number => level !== undefined);
            if (known.length > 0) {
                const average = known.reduce((sum, level) => sum + level, 0) / known.length;
                next.groupVolume = Math.round(average * 100) / 100;
            }
        }
    }

    if (event.entity_id === current.transportTargetID) {
        if (endedStates.has(event.state)) {
            return { kind: "end" };
        }
        const title = optionalString(attributes["media_title"]);
        if (title !== null) {
            const artist = optionalString(attributes["media_artist"]);
            const updatedAt = optionalString(attributes["media_position_updated_at"]);
            next = {
                ...next,
                title,
                artist,
                isPlaying: event.state === "playing",
                position: optionalNumber(attributes["media_position"]),
                positionDate: updatedAt === null ? null : toAppleReferenceSeconds(updatedAt),
                duration: optionalNumber(attributes["media_duration"]),
            };
            // The art is cached by the app, which can't run here; a new track shows the placeholder until the
            // background push lets the app fetch the real one.
            if (title !== current.title || artist !== (current.artist ?? null)) {
                next.artworkFileName = null;
            }
        }
    }

    const trackChanged = next.title !== current.title || (next.artist ?? null) !== (current.artist ?? null);
    const playbackChanged = next.isPlaying !== current.isPlaying;
    const changed =
        trackChanged ||
        playbackChanged ||
        next.groupVolume !== current.groupVolume ||
        (next.position ?? null) !== (current.position ?? null) ||
        (next.positionDate ?? null) !== (current.positionDate ?? null) ||
        (next.duration ?? null) !== (current.duration ?? null);
    if (!changed) {
        return { kind: "none" };
    }
    return { kind: "update", state: next, trackChanged, playbackChanged };
}
