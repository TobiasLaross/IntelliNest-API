import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMediaPlayerEvent, ContentState, toAppleReferenceSeconds } from "./contentState";

const kitchen = "media_player.kitchen";
const playroom = "media_player.lekrummet";

function playingState(): ContentState {
    return {
        title: "Ha dig igen",
        artist: "Victor Leksell",
        roomName: "Köket +1",
        isPlaying: true,
        position: 30,
        positionDate: 781_340_000,
        duration: 173,
        groupVolume: 0.4,
        artworkFileName: "3f9a1c0b7d2e4a51.jpg",
        transportTargetID: kitchen,
        volumeSpeakerIDs: [kitchen, playroom],
    };
}

function trackAttributes(title: string, artist: string) {
    return {
        media_title: title,
        media_artist: artist,
        media_position: 0,
        media_position_updated_at: "2025-10-05T09:00:00+00:00",
        media_duration: 201,
        volume_level: 0.4,
    };
}

test("a new track on the transport target replaces the track and drops the stale artwork", () => {
    const change = applyMediaPlayerEvent(playingState(), new Map(), {
        entity_id: kitchen,
        state: "playing",
        attributes: trackAttributes("Svag", "Victor Leksell"),
    });

    assert.equal(change.kind, "update");
    if (change.kind !== "update") return;
    assert.equal(change.trackChanged, true);
    assert.equal(change.state.title, "Svag");
    assert.equal(change.state.duration, 201);
    assert.equal(change.state.artworkFileName, null);
    assert.equal(change.state.positionDate, toAppleReferenceSeconds("2025-10-05T09:00:00+00:00"));
});

test("pausing keeps the artwork and only flips playback", () => {
    const current = playingState();
    const change = applyMediaPlayerEvent(current, new Map(), {
        entity_id: kitchen,
        state: "paused",
        attributes: {
            ...trackAttributes("Ha dig igen", "Victor Leksell"),
            media_position: 30,
            media_position_updated_at: "2025-10-05T09:00:00+00:00",
            media_duration: 173,
        },
    });

    assert.equal(change.kind, "update");
    if (change.kind !== "update") return;
    assert.equal(change.trackChanged, false);
    assert.equal(change.playbackChanged, true);
    assert.equal(change.state.artworkFileName, current.artworkFileName);
});

for (const endedState of ["idle", "off", "unavailable"]) {
    test(`the transport target going ${endedState} ends the activity`, () => {
        const change = applyMediaPlayerEvent(playingState(), new Map(), { entity_id: kitchen, state: endedState });
        assert.equal(change.kind, "end");
    });
}

test("a grouped speaker's volume moves the group average", () => {
    const volumes = new Map([[kitchen, 0.4]]);
    const change = applyMediaPlayerEvent(playingState(), volumes, {
        entity_id: playroom,
        state: "playing",
        attributes: { volume_level: 0.2 },
    });

    assert.equal(change.kind, "update");
    if (change.kind !== "update") return;
    assert.equal(change.state.groupVolume, 0.3);
    assert.equal(change.trackChanged, false);
});

test("an unrelated speaker changes nothing", () => {
    const change = applyMediaPlayerEvent(playingState(), new Map(), {
        entity_id: "media_player.spa",
        state: "idle",
        attributes: { volume_level: 0.9 },
    });
    assert.equal(change.kind, "none");
});

test("dates are converted to Apple's reference date", () => {
    assert.equal(toAppleReferenceSeconds("2001-01-01T00:00:00Z"), 0);
    assert.equal(toAppleReferenceSeconds("not a date"), null);
});
