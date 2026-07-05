# Mobile (`mobile/`) — Expo SDK 57 notes for agents

This is a brand-new Expo SDK 57 (React Native 0.86) app.
Read the exact versioned docs at `https://docs.expo.dev/versions/v57.0.0/` before writing code — many APIs moved.

## Stack

- Expo SDK 57 + React Native 0.86 + React 19.2
- AsyncStorage for token persistence
- Plain `fetch` for the API
- Manual screen switching (no React Navigation yet) — see `App.tsx`

## Talking to the web API

- `src/api.ts` exports `API_BASE_URL`. Default points to the Android emulator alias `10.0.2.2`. For a physical device, set `EXPO_PUBLIC_API_URL` at build time.
- Auth uses the `Authorization: Bearer <jwt>` header returned by `POST /api/mobile/login`.
- See `../web/src/lib/session.ts` in the web app for how it verifies the same JWT.

## Commands

```sh
cd mobile
npm start                       # Expo dev server
npm run ios | npm run android   # open simulator
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000 npm start   # device on LAN
```
