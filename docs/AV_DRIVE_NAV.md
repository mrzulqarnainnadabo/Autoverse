# AV Drive — Mobile navigation

## What was added

- `mobile/navigation/AvDriveNavigator.tsx` — in-app stack (Home → Book / Earn / Jobs / Job detail)
- `mobile/App.tsx` — Expo entry pointing at AV Drive for pilot testing

No `react-navigation` dependency (matches existing callback-prop screens).

## Routes

| Screen | Purpose |
|--------|---------|
| Home | Book / Earn / recent jobs |
| Book | Client request (airport or intercity) |
| Availability | Partner city, job types, available toggle |
| Jobs | List |
| JobDetail | Signals, chat/call/WhatsApp, maps |

## Wire into full app later

```tsx
// From a tab or menu:
import AvDriveNavigator from './navigation/AvDriveNavigator';

<AvDriveNavigator
  currentUserId={user.id}
  onOpenConversation={(id) => navigation.navigate('Chat', { conversationId: id })}
/>
```

## Prerequisites

1. Supabase AV Drive tables (done)
2. Backend `/api/v1/av-drive` deployed and reachable via `EXPO_PUBLIC_API_BASE_URL`
3. User signed in (Supabase session)

## Run

```bash
cd mobile
npm install
npx expo start
```
