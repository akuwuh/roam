# Travel Planner Setup

## Overview
A minimal white and black UI travel planner app with two main features:
1. **Plan Itinerary** - Generate travel itineraries using Gemini API (requires internet)
2. **Chat with AI** - Ask questions about your itinerary using local Cactus LLM (works offline)

## Setup Instructions

### 1. Get a Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Add API Key to the App
Open `app.json` and add your API key to the `extra` section:

```json
{
  "expo": {
    ...
    "extra": {
      "geminiApiKey": "your-actual-api-key-here"
    }
  }
}
```

**Note**: The API key is stored in `app.json` under `extra.geminiApiKey`. For production apps, consider using environment variables or secure key management.

### 3. Run the App

#### First Time Setup (or after adding dependencies)
```bash
# Clean and rebuild iOS
npm run prebuild:clean
npm run ios

# Or for Android
npm run android
```

#### Quick Reload (after code changes)
If the app is already running:
- **iOS**: Press `Cmd + R` in the simulator, or shake device and tap "Reload"
- **Android**: Press `R` twice in terminal, or shake device and tap "Reload"
- **Both**: In terminal where Metro is running, press `r` to reload

#### Restart Development Server
```bash
# Stop current server (Ctrl+C) then:
npm start

# Or if you need to clear cache:
npm start -- --clear
```

#### Full Rebuild (if things break)
```bash
# Clean everything and start fresh
npm run clean
npm run prebuild:clean
npm run ios  # or npm run android
```

## Features

### Home Screen
- View all saved itineraries
- Create new itinerary button
- Minimal white background with black text

### Planner Screen
- Enter destination
- Specify number of days
- Add interests (optional)
- Generate itinerary using Gemini API
- **Requires internet connection**

### Itinerary Screen
- View day-by-day schedule
- See activities with times and descriptions
- Button to chat with AI about the trip

### Chat Screen
- Ask questions about your itinerary
- Get suggestions and tips
- Modify schedule through conversation
- **Works completely offline** using local Cactus LLM
- First time: Download AI model (one-time setup)

## Design
- Pure white (#FFFFFF) background
- Black (#000000) text and buttons
- Gray (#666666, #999999) for secondary text
- Minimal borders and spacing
- Simple, clean typography

## Tech Stack
- React Native + Expo
- React Navigation (stack navigator)
- AsyncStorage (local data persistence)
- Gemini API (itinerary generation)
- Cactus React Native (local LLM)

## Notes
- Itineraries are saved locally on device
- Chat conversations are not persisted (clears on exit)
- AI model download is required once for offline chat
- Gemini API calls require internet connection

