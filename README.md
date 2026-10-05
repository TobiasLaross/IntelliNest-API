# IntelliNest-API
## Overview
This project is the backend service for the IntelliNest app, responsible for services that are not supported by Home Assistant, for example Apple APNs service integration for sending notifications to iOS devices using Apple Push Notification service (APNs).

## Prerequisites

- Node.js
- npm or yarn
- APNs credentials

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/TobiasLaross/IntelliNest-API.git
cd IntelliNest-API
npm install
```

## Configuration
Create a .env file in the root directory of the project and add your APNs credentials:
```bash
APNS_KEY_PATH=path/to/apns/key.p8
APNS_KEY_ID=your_key_id
APNS_TEAM_ID=your_team_id
```
## Running the Application
```bash
npm run buildDeploy
```
The server listens on http://localhost:3000 by default.

## Usage
The endpoint is designed to be compatible with Home Assistant notify service
Send a POST request to /notify with the following JSON payload:


```bash
{
  "push_token": "device_push_token",
  "title": "Notification Title",
  "message": "Notification Message",
  "group": "Optional Group ID"
}
```

## Live Activity updates

Keeps the IntelliNest music Live Activity current while the app is closed. Every request needs
`Authorization: Bearer <INTELLINEST_API_SECRET>`; set `INTELLINEST_API_SECRET` in `.env` (the routes refuse all
requests without it).

- `POST /live-activity/register` with `{ push_token, device_token, content_state }`: sent by the app whenever it
  starts or updates the activity. `push_token` is the activity's ActivityKit token, `device_token` the app's
  APNs token (used for a background push that lets the app fetch new album art).
- `POST /live-activity/unregister` with `{ push_token }`: sent when the activity ends.
- `POST /live-activity/media-state` with `{ entity_id, state, attributes }`: sent by a Home Assistant automation
  on every `media_player` change. The relay turns it into a `liveactivity` push for each registered activity
  that follows that speaker.

Run the tests with `npm test`.
