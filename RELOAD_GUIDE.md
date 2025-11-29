# Quick Reload Guide

## 🔄 How to Reload the App

### If Metro is Already Running

#### Option 1: In the Terminal (Easiest)
Press `r` in the terminal where Metro bundler is running

#### Option 2: In the iOS Simulator
- Press `Cmd + R` on your keyboard
- Or: Press `Cmd + D` → tap "Reload"

#### Option 3: On Physical Device
- Shake the device → tap "Reload"

### If You Need to Restart Metro

```bash
# Stop current server: Ctrl+C
# Then restart:
npm start

# Or with cache clearing:
npm start -- --clear
```

## 🔧 When to Use Different Reload Methods

### Press `r` in Terminal (Most Common)
- After changing JavaScript/TypeScript code
- After updating component styles
- After modifying hooks or utilities

### Restart Metro (`npm start`)
- After installing new npm packages
- After changing `app.json` configuration
- If hot reload stops working

### Full Rebuild (`npm run ios`)
- After adding native dependencies
- After changing native code (iOS/Android)
- After modifying `app.json` plugins
- If app crashes on launch

## 📝 Your Current Setup

Your API key is now stored in `app.json`:
```json
{
  "expo": {
    "extra": {
      "geminiApiKey": "AIzaSy..."
    }
  }
}
```

Changes to `app.json` require:
1. Stop Metro (Ctrl+C)
2. Restart: `npm start`
3. Reload app: Press `r` in terminal

## ⚡ Quick Commands

```bash
# Reload app (if Metro is running)
r

# Restart Metro
npm start

# Restart with clean cache
npm start -- --clear

# Full rebuild iOS
npm run ios

# Full rebuild Android
npm run android
```

