# 🌵 Cactus Chat

A local AI chatbot powered by [Cactus SDK](https://cactuscompute.com/) running entirely on your device.

## Prerequisites

- **Xcode** (macOS only, for iOS builds)
- **CocoaPods**: `sudo gem install cocoapods`
- **Physical iPhone** connected via USB (recommended for LLM performance)
- **Free Apple Developer Account** (sign in via Xcode)

## Quick Start

### 1. Configure API Key

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your OpenRouter API key
# Get a free key from: https://openrouter.ai/keys
```

**Important**: `.env` is gitignored and will never be committed. Keep your API keys secure!

### 2. Install Dependencies

```bash
npm install
```

### 3. Build for iOS Device

Connect your iPhone via USB, then:

```bash
npm run build:ios:device
```

This will:
- Generate native `ios/` folder with Cactus native code
- Build the app (~5-10 minutes first time)
- Install on your connected iPhone

### 4. Start Development Server

After the initial build, use hot reload:

```bash
npm run dev
```

Changes to JS/TS files will hot reload instantly on your device!

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build:ios:device` | Build and install on connected iPhone |
| `npm run build:ios` | Build for iOS simulator |
| `npm run prebuild` | Generate native folders |
| `npm run prebuild:clean` | Regenerate native folders from scratch |
| `npm run clean` | Remove native folders and cache |
| `npm run reset` | Full reset and regenerate native folders |

## Development Workflow

1. **First time**: Run `npm run build:ios:device` (one-time ~5-10 min build)
2. **Daily development**: Run `npm run dev` for hot reload
3. **Added native dependency?**: Run `npm run prebuild:clean` then rebuild

## In the App

1. Tap **"Download Model"** to download the AI model (~500MB)
2. Wait for download to complete (requires WiFi)
3. Start chatting with local AI!

## Notes

- **Expo Go won't work** - This app uses native modules (Cactus SDK)
- **Model runs on-device** - No internet required after download
- **Works offline** - All inference happens locally

## Troubleshooting

### Build fails with CocoaPods error
```bash
cd ios && pod install --repo-update
```

### Device not detected
- Ensure iPhone is connected via USB
- Trust the computer on your iPhone when prompted
- Open Xcode and check device is recognized

### Model download fails
- Ensure stable WiFi connection
- The model is ~500MB-1.5GB depending on variant

## Tech Stack

- [Expo](https://expo.dev/) with dev-client
- [Cactus React Native SDK v1.2](https://cactuscompute.com/docs/react-native)
- [React Native Nitro Modules](https://github.com/nicklockwood/react-native-nitro)
- TypeScript

