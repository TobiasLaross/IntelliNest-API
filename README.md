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
cd intellinest-backend
npm install
cd intellinest-backend
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


