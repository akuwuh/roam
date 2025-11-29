Here’s the markdown from that file, in a code block, exactly as stored:

````markdown
# TripCactus: AI-powered trip planner PRD

## 1. Purpose & background

The **Mobile AI Hackathon** hosted by Cactus, Nothing and Hugging Face invites Flutter, React Native and Kotlin developers to build mobile agents on the edge:contentReference[oaicite:0]{index=0}.  The mission is to leverage **on-device AI** to solve real user problems, with a focus on:

* **Total Privacy** – Data never leaves the device.
* **Zero Latency** – Real-time interactions for voice, UI, and gaming.
* **Offline Capability** – Works anywhere, even without a network:contentReference[oaicite:1]{index=1}.

Teams must use the **Cactus SDK** (supporting React Native, Flutter, Kotlin, C++) and can run models such as Liquid Foundation Models, Smol, Qwen3 and others:contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}.  Successful submissions must:

* Use the Cactus SDK.
* Demonstrate functional AI features running locally.
* Ship a usable .apk/.ipa or TestFlight link:contentReference[oaicite:4]{index=4}.

**TripCactus** is a local-first trip companion aligned with these goals:

* Plans a user’s daily itinerary with a **hybrid** local + cloud architecture.
* Stores and manages trip details in an on-device **Trip Memory Store** that powers offline Q&A.
* Demonstrates Cactus embeddings, completions and optional hybrid mode to satisfy **Memory Master** and **Hybrid Hero** tracks.

The PRD defines a tight scope around:

1. A **hybrid day planner** (Hero Feature 2).
2. An **offline “Trip Brain” chat** over a local itinerary knowledge base (Hero Feature 1).

This document is intended as the **ultimate context** for LLM coding agents to implement TripCactus end-to-end, with clearly separated domains and strict context boundaries.

---

## 2. Hackathon alignment & success criteria

### 2.1 Tracks & how TripCactus maps to them

From the hackathon description:contentReference[oaicite:5]{index=5}:

* **Main Track: Best Mobile Application with On-Device AI.**
* **Track 1: The Memory Master** – Best implementation of a shared memory/knowledge base for local LLMs.
* **Track 2: The Hybrid Hero** – Best execution of a local ⇄ cloud hybrid inference strategy (router pattern).

TripCactus mapping:

1. **Main Track (Best Mobile App with On-Device AI)**  
   * Uses **Cactus React Native SDK** to run local LLM inference directly on device:contentReference[oaicite:6]{index=6}.  
   * Offline itinerary Q&A and small on-device edits demonstrate true edge capabilities.
   * Smooth timeline UI and chat UX showcase responsiveness (zero perceived latency once models are downloaded).

2. **Track 1 – Memory Master (shared memory / knowledge base)**  
   * Implements a **Trip Memory Store**: a local semantic memory layer representing flights, hotels, activities, and inferred day summaries.  
   * Uses Cactus **text embeddings** for semantic search over itinerary items:contentReference[oaicite:7]{index=7}.  
   * Multiple “agents” (Trip Brain chat, planner, logistics helpers) read from and write to the same Trip Memory Store.

3. **Track 2 – Hybrid Hero (local ⇄ cloud router pattern)**  
   * Implements a simple but clear **router** that decides:
     * When to call a **cloud planner API** (for heavy, online itinerary generation using global knowledge).
     * When to rely entirely on **local LLM** for edits and Q&A.
   * Demonstrates optional **hybrid completion mode** where local inference falls back to a cloud provider via Cactus’s hybrid mode:contentReference[oaicite:8]{index=8}.

### 2.2 Evaluation criteria mapping

Based on the hackathon context and typical on-device AI events, we optimise for:

* **Technical Implementation** – Deep usage of the Cactus SDK:
  * `CactusLM.complete` for local completions.
  * `CactusLM.embed` for semantic memory.
  * (Optional) `mode: 'hybrid'` to show hybrid fallback:contentReference[oaicite:9]{index=9}:contentReference[oaicite:10]{index=10}.
* **Edge Capabilities** – Demonstrate:
  * **Offline capability**: Trip Q&A and schedule edits work without network.
  * **Total privacy**: Raw trip data never leaves device; only coarse constraints go to cloud.
  * **Zero latency**: Local LLM used for “fast” tasks; only big planning calls go remote.
* **Design & UX** – Provide a polished timeline view, intuitive chat, and clear “offline brain” story.
* **Utility & Innovation** – Solve real travel problems such as organising logistics, answering “what/when/where” questions, and adjusting schedules on the fly.
* **Completeness** – Deliver a functional build with:
  * Stable data model and memory store.
  * Working Cactus integration.
  * Router and cloud endpoint (can be a simple HTTP function) and local memory persistence.

---

## 3. User flows & UI views

TripCactus follows the flows defined by the team:

1. **Initial load (Screen 1)** – List existing trips stored locally with:
   * Trip name, date range, and a small city badge.
   * A primary **“New trip”** button.
   * A status indicator that Cactus is:
     * Downloading model.
     * Ready to use.
   * This screen is the anchor for testing multiple trips and showing persistent state.

2. **Trip view (Screen 2)** – When the user enters a trip (new or existing):
   * Show a **daily timeline-style itinerary**:
     * Dates across the top (horizontal), or a day picker.
     * Vertical timeline of events (flights, hotels, activities, transport) for the selected day.
   * A **Settings** icon or button where the user can:
     * Edit trip details (name, cities, date range, home airport).
     * Manually add or edit flights, hotels, and activities.
   * A **“Generate itinerary with AI”** button:
     * Triggers the **Hybrid Day Planner** to fill the day or selected range.
     * Stores generated events in the local DB + Trip Memory Store.

3. **Chat view (Screen 3)** – Accessed from a chat icon on the trip screen:
   * A chat UI pinned to the **current trip**.
   * User can:
     * Ask questions about trip logistics and schedule.
     * Request changes (“Move dinner to earlier”, “Add a free block in the afternoon”).
   * The chat uses the **local Trip Brain**:
     * Offline by default (local Cactus model).
     * If online, can optionally call cloud to:
       * Regenerate bigger chunks of the plan.
       * Synchronise updated schedule into the Trip Memory Store.

These flows map directly to the features below.

---

## 4. High-level architecture

### 4.1 Components & domains

1. **UI / Presentation Layer (React Native + Expo)**  
   * Screens:
     * **TripsListScreen** (Screen 1).
     * **TripTimelineScreen** (Screen 2).
     * **TripChatScreen** (Screen 3).
   * Aligns with the hackathon’s emphasis on polished, intuitive mobile interfaces:contentReference[oaicite:11]{index=11}.

2. **Domain Layer (TypeScript models & services)**  
   * **Trip Domain** – Represents trips, days, and items (flights, hotels, activities).
   * **Place / Logistics Domain** – Light “logistics graph” with:
     * Place entities (`Place`).
     * Area tags (e.g., “Shibuya”, “Roppongi”).
     * “Near” relationships (geospatial-lite).
   * **Trip Memory Domain** – Semantic memory built on:
     * Canonicalised texts for each itinerary item.
     * Embeddings stored locally.
   * **Router Domain** – Decides between:
     * Local Cactus LLM.
     * Cloud planner API.
     * Optional Cactus hybrid mode.

3. **Infrastructure Layer**  
   * **Local Storage**:
     * SQLite (via `expo-sqlite`) or similar for trips, items, places, and memory.
   * **Cactus SDK**:
     * `cactus-react-native` for the local LLM & embeddings:contentReference[oaicite:12]{index=12}:contentReference[oaicite:13]{index=13}.
   * **Cloud Planner Service**:
     * Simple HTTP endpoint (e.g. Cloudflare Worker, Node/Express, etc.).
     * Wraps a remote LLM (e.g. Gemini, OpenAI, or HF Inference API) for heavy itinerary generation.

### 4.2 Key data boundaries

**On-device only (never sent to cloud):**

* Raw itinerary:
  * Flight numbers, confirmation codes, airline details.
  * Hotel names and addresses.
  * Activity titles, exact times, and user notes.
* Embeddings and Trip Memory Store data.
* Full chat history in the Trip Brain (except prompts where user explicitly consents to cloud use).

**Cloud-visible (coarse, privacy-safe):**

* City / region names.
* Trip date ranges.
* High-level constraints:
  * “Free morning, busy afternoon.”
  * “Prefers museums & coffee.”
* Very coarse context such as:
  * “Already visiting one museum this trip.”
  * “Budget: low / mid / high.”

This partition supports the hackathon’s requirement for **Total Privacy** while still leveraging cloud models for heavy planning:contentReference[oaicite:14]{index=14}.

---

## 5. Data models

High-level TypeScript types (implementation can use interfaces or classes).

### 5.1 Core trip entities

```ts
type Trip = {
  id: string;
  name: string;
  startDate: string;   // '2025-12-01'
  endDate: string;     // '2025-12-10'
  homeAirport?: string;
  primaryCity?: string;
};

type DayPlan = {
  id: string;
  tripId: string;
  date: string;        // '2025-12-03'
};

type TripItemType = 'FLIGHT' | 'LODGING' | 'ACTIVITY' | 'TRANSPORT';
````

```ts
type TripItemMeta = {
  airline?: string;
  flightNumber?: string;
  confirmationCode?: string;
  originAirport?: string;
  destinationAirport?: string;

  hotelName?: string;
  address?: string;

  notes?: string;
};

type TripItem = {
  id: string;
  tripId: string;
  dayId?: string;          // optional for multi-day items like lodging
  type: TripItemType;

  title: string;           // “Flight to Tokyo”, “Tokyo Tower”, etc.
  placeId?: string;        // FK to Place
  city?: string;
  areaTag?: string;        // e.g. “Shibuya”
  startDateTime?: string;  // ISO
  endDateTime?: string;    // ISO

  meta?: TripItemMeta;
};
```

### 5.2 Places & “logistics graph”

```ts
type Place = {
  id: string;             // 'tokyo-tower'
  name: string;           // 'Tokyo Tower'
  city: string;           // 'Tokyo'
  areaTags: string[];     // ['Roppongi']
  near: string[];         // list of related placeIds or area tags
};
```

*No full maps are stored.*  Instead we model **relative proximity**.
Example:

```json
{
  "id": "tokyo-tower",
  "name": "Tokyo Tower",
  "city": "Tokyo",
  "areaTags": ["Roppongi"],
  "near": ["zojoji-temple", "roppongi-hills"]
}
```

This supports questions like **“What can I do after Tokyo Tower?”** by using the `near` relationships and area tags to suggest reasonable next activities without consulting online maps.

### 5.3 Trip Memory Store (Track 1 core)

```ts
type MemoryChunkKind = 'ENTRY' | 'DAY_SUMMARY';

type MemoryChunk = {
  id: string;
  tripId: string;
  itemId?: string;        // link back to TripItem
  kind: MemoryChunkKind;
  text: string;           // canonical text
  embedding: number[];    // from CactusLM.embed
};
```

**Canonical text examples:**

* Flight:

  > “Flight from Toronto (YYZ) to Tokyo (HND) on 2025-12-01 departing at 10:35 and arriving at 15:20, Air Canada AC123, confirmation ABC123.”

* Hotel:

  > “Staying at Shibuya Excel Hotel Tokyu in Tokyo from 2025-12-01 to 2025-12-05, address 1-12-2 Dogenzaka, Shibuya.”

* Activity:

  > “Visit Tokyo Tower in Tokyo on 2025-12-02 from 14:00 to 16:00, in the Roppongi area.”

**Generation rules:**

* Every time a `TripItem` is created or updated:

  * Build canonical `text`.
  * Compute embedding via `cactusLM.embed({ text })`.
  * Upsert `MemoryChunk` for that item.
* Optionally, daily summaries are generated via local LLM and stored as `DAY_SUMMARY`.

### 5.4 Logistics graph (derived)

We don’t persist edges explicitly; we derive them from the models:

* **WITHIN_DAY** – `DayPlan` → `TripItem` via `dayId`.
* **BEFORE/AFTER** – Order by `startDateTime` for items on the same `DayPlan`.
* **ANCHOR** – Items with `type` in `['FLIGHT', 'LODGING']`.
* **AT_PLACE** – `TripItem.placeId` → `Place`.
* **NEAR** – `Place.near` relationships.
* **SAME_AREA** – Items sharing `city` or `areaTag`.

This “logistics graph” allows deterministic answers to “what comes before/after” and “what’s near what” without external APIs.

---

## 6. Cactus integration (React Native)

### 6.1 Cactus SDK usage

We use the official **Cactus React Native SDK**:

* Install: `npm install cactus-react-native react-native-nitro-modules`.
* Use either `CactusLM` class or `useCactusLM` hook for completions and embeddings.
* Use `embed()` for text embeddings.
* Optionally use **hybrid mode** for retries/fallbacks.

**Model choice:**

* Default to `qwen3-0.6` or similar small model supported by Cactus for text.
* For embeddings, either reuse the same model or, if supported, specify a dedicated embedding model.

### 6.2 Cactus hook wrapper

High-level wrapper (pseudo-type):

```ts
// hooks/useLocalTripModel.ts
import { useCactusLM, type Message } from 'cactus-react-native';

export function useLocalTripModel() {
  const cactusLM = useCactusLM({
    model: 'qwen3-0.6',
    contextSize: 2048,
  });

  // On app root, ensure download is triggered and progress is shown in UI.
  return cactusLM;
}
```

UI surfaces:

* An initial **“Downloading on-device AI”** status, using `isDownloading` and `downloadProgress` provided by the hook.

---

## 7. Hero Feature 1 – Offline Trip Brain (Track 1 core)

### 7.1 Goal

Provide an **offline chat assistant** that can:

* Answer “when/where/what” questions about the trip using only local data.
* Suggest **small schedule adjustments** (swap items, shift times) using the Trip Memory Store plus logistics graph.
* Be safe and reliable: if information is not present in local memory, it must respond with “I don’t know” and optionally prompt the user to add data.

### 7.2 Scope & guarantees

**Guaranteed (deterministic from data):**

* Event times and dates (flights, hotels, activities).
* Event locations (city, area, place).
* Timeline ordering (what comes before/after).
* Free time windows within a day.

**Fuzzy / best-effort:**

* Travel time between locations (no real traffic or distance).
* Quality or popularity of places (unless pre-encoded).
* Suggestions beyond the offline `Place` data or user-defined itinerary.

The LLM is used to **explain and rephrase** deterministic answers, not to invent missing facts.

### 7.3 System prompt for Trip Brain

Draft system prompt:

> You are TripBrain, an offline trip assistant for a single user.
>
> You ONLY know what is in the provided trip context. Do not guess details that are not present.
>
> Rules:
>
> 1. Use ONLY the events and facts in the trip context to answer questions.
> 2. If the answer is not present in the context, clearly say you don’t know and suggest that the user add the missing flight, hotel or activity.
> 3. If the user requests schedule changes, describe the change as a list of edits to the existing items (e.g. “Move ‘Tokyo Tower’ from 16:00 to 10:00 on 2025-12-02”).
> 4. Never fabricate booking numbers, confirmation codes, times or addresses.
> 5. Keep answers concise and focused on the user’s question. Provide times, dates and locations in a clear format.
> 6. Do not call any external tools or APIs; all reasoning must be based on the provided context.

This prompt is prepended to all Trip Brain calls.

### 7.4 Question → pipeline pseudocode

Below are 4 canonical queries and their end-to-end pipelines.

---

#### Query 1: “What time is my flight to Tokyo tomorrow?”

**Goal:** Answer from local data only.

**Pipeline pseudocode (high level):**

```ts
async function answerFlightTimeQuestion(
  question: string,
  tripId: string,
  lm: LocalLMClient // wrapper around CactusLM
): Promise<string> {
  // 1. Interpret “tomorrow” as a date in app code (not LLM).
  const today = currentTripDate(tripId);  // or device date
  const targetDate = addDays(today, 1);

  // 2. Filter TripItems for that trip and date and type FLIGHT.
  const flights = await db.getTripItems({
    tripId,
    date: targetDate,
    type: 'FLIGHT',
  });

  // 3. If we find exactly one destination "Tokyo" (destinationCity), select it.
  const tokyoFlights = flights.filter(f =>
    (f.meta?.destinationAirportCity ?? f.city)?.toLowerCase().includes('tokyo')
  );

  const relevantFlights = tokyoFlights.length > 0 ? tokyoFlights : flights;

  // 4. Build context text for LLM from deterministic data.
  if (relevantFlights.length === 0) {
    // Direct answer without LLM: no flight found.
    return "I don't see any flights for tomorrow in your trip data.";
  }

  const contextLines = relevantFlights.map(f => canonicalizeItem(f));
  const tripContext = contextLines.join('\n');

  // 5. Call TripBrain with strict system prompt.
  const messages: Message[] = [
    { role: 'system', content: TRIP_BRAIN_SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        `Trip context:\n${tripContext}\n\n` +
        `Question: ${question}`,
    },
  ];

  const result = await lm.complete({ messages, mode: 'local' });
  return result.response;
}
```

**Notes:**

* Logical interpretation of “tomorrow” happens in code, not LLM.
* LLM is only used to phrase the answer nicely.
* If no relevant flights exist, we short-circuit with a deterministic response.

---

#### Query 2: “What do I do after visiting Tokyo Tower?”

**Goal:** Use logistics graph to find the **next event** after a given anchor.

**Pipeline pseudocode:**

```ts
async function answerAfterPlaceQuestion(
  question: string,
  tripId: string,
  lm: LocalLMClient
): Promise<string> {
  // 1. Identify anchor item using embeddings.
  const anchorEmbedding = (await lm.embed({ text: question })).embedding;

  const candidateChunks = await memoryStore.search(tripId, anchorEmbedding, {
    topK: 5,
  });

  const anchorChunk = candidateChunks[0]; // assume best match
  if (!anchorChunk?.itemId) {
    return "I can't find that place in your trip yet. Try adding it to your itinerary.";
  }

  const anchorItem = await db.getTripItemById(anchorChunk.itemId);
  if (!anchorItem?.startDateTime || !anchorItem.dayId) {
    return "I found the place, but it is not scheduled in time yet.";
  }

  // 2. Get all items on the same day.
  const sameDayItems = await db.getTripItemsByDay(anchorItem.dayId);

  // 3. Sort by startDateTime.
  const sorted = sameDayItems
    .filter(i => i.startDateTime)
    .sort((a, b) =>
      a.startDateTime!.localeCompare(b.startDateTime!)
    );

  // 4. Find the next item after the anchor.
  const index = sorted.findIndex(i => i.id === anchorItem.id);
  const nextItem = index >= 0 ? sorted[index + 1] : undefined;

  // 5. Build deterministic context.
  const contextLines = sorted.map(canonicalizeItem);
  const tripContext = contextLines.join('\n');

  const userQuestion =
    nextItem
      ? `After this event, what is the next scheduled activity?`
      : `There is no event scheduled after this one. How can I explain that to the user?`;

  // 6. Ask LLM to summarise.
  const messages: Message[] = [
    { role: 'system', content: TRIP_BRAIN_SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        `Trip context (same day events, in time order):\n${tripContext}\n\n` +
        `Anchor event: ${canonicalizeItem(anchorItem)}\n` +
        `Question from user: "${question}"\n\n` +
        `${userQuestion}`,
    },
  ];

  const result = await lm.complete({ messages, mode: 'local' });
  return result.response;
}
```

**Notes:**

* The actual computation of “next event” is deterministic.
* LLM only transforms this into user-friendly language.

---

#### Query 3: “Do I have free time between 2 and 5 pm near my hotel?”

**Goal:** Use logistics graph + timeline to compute free blocks.

**Pipeline pseudocode:**

```ts
async function answerFreeTimeNearHotel(
  question: string,
  tripId: string,
  dayId: string,
  lm: LocalLMClient
): Promise<string> {
  // 1. Parse the time window (14:00 to 17:00) in code (not LLM).
  const targetWindow = { start: '14:00', end: '17:00' };

  // 2. Find hotel item for that day (or closest for that city).
  const hotel = await db.getHotelForDay(tripId, dayId);
  const dayItems = await db.getTripItemsByDay(dayId);

  // 3. Compute busy intervals.
  const busyIntervals = dayItems
    .filter(i => i.startDateTime && i.endDateTime)
    .map(i => ({
      item: i,
      start: timeOfDay(i.startDateTime!),
      end: timeOfDay(i.endDateTime!),
    }));

  const freeBlocks = computeFreeBlocks(busyIntervals, '08:00', '22:00');

  // 4. Find blocks overlapping with target window.
  const matchingBlocks = freeBlocks.filter(b =>
    overlaps(b, targetWindow)
  );

  if (matchingBlocks.length === 0) {
    // Deterministic negative answer.
    return "You don't have an entirely free block between 2 pm and 5 pm that day.";
  }

  // 5. Optionally, use geospatial-lite info to propose nearby activities.
  let nearbySuggestions: TripItem[] = [];
  if (hotel?.placeId) {
    nearbySuggestions = await suggestNearbyActivities(tripId, hotel.placeId, dayId);
  }

  // 6. Build text context.
  const contextParts: string[] = [];
  contextParts.push('Busy intervals:');
  for (const b of busyIntervals) {
    contextParts.push(
      `- ${canonicalizeItem(b.item)} [${b.start}–${b.end}]`
    );
  }

  contextParts.push('Free blocks:');
  for (const block of matchingBlocks) {
    contextParts.push(`- Free from ${block.start} to ${block.end}`);
  }

  if (hotel) {
    contextParts.push(`Hotel location: ${canonicalizeItem(hotel)}`);
  }

  if (nearbySuggestions.length > 0) {
    contextParts.push('Nearby activities already in your itinerary:');
    nearbySuggestions.forEach(a => {
      contextParts.push(`- ${canonicalizeItem(a)}`);
    });
  }

  const tripContext = contextParts.join('\n');

  // 7. Ask LLM to explain results.
  const messages: Message[] = [
    { role: 'system', content: TRIP_BRAIN_SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        `Trip context:\n${tripContext}\n\n` +
        `User question: "${question}".\n` +
        `Explain clearly if the user has free time in that window and mention any nearby activities or suggestions.`,
    },
  ];

  const result = await lm.complete({ messages, mode: 'local' });
  return result.response;
}
```

---

#### Query 4: “Move my museum visit earlier and free up the evening.”

**Goal:** Generate an **edit plan** for the current day schedule.

**Pipeline pseudocode:**

```ts
async function suggestReorderedDay(
  userInstruction: string,
  tripId: string,
  dayId: string,
  lm: LocalLMClient
): Promise<string> {
  const items = await db.getTripItemsByDay(dayId);
  const dayContext = items.map(canonicalizeItem).join('\n');

  const messages: Message[] = [
    { role: 'system', content: `
You are TripBrain. The user already has a plan for this day.
You will propose edits to the plan based only on the existing activities.

Rules:
1. Keep the same set of activities; you may change their times and order.
2. Do not invent new activities or delete any unless explicitly requested.
3. Output your answer in two sections:
   (A) A human explanation.
   (B) A list of edits in JSON with fields:
       - itemTitle (string)
       - newStartTime (optional, 'HH:MM' 24h)
       - newEndTime (optional)
       - newOrderIndex (optional integer)
If the instruction cannot be satisfied without breaking obvious constraints, say so.
  `.trim() },
    {
      role: 'user',
      content:
        `Existing day plan:\n${dayContext}\n\n` +
        `User instruction: "${userInstruction}".\n` +
        `Propose a new ordering and timing that keeps travel reasonable.`,
    },
  ];

  const result = await lm.complete({ messages, mode: 'local' });

  // The app will parse the JSON block in section (B) and apply updates to DB.
  return result.response;
}
```

**Notes:**

* App is responsible for:

  * Parsing JSON portion.
  * Applying updates to `TripItem` records.
  * Triggering Trip Memory Store updates (re-embedding items).
* Judges can see clear **agent/knowledge base** interplay.

---

## 8. Hero Feature 2 – Hybrid Day Planner (Track 2 core)

### 8.1 Goal

Provide a **“Magic Day”** planner that:

* Uses a **cloud LLM** for heavy itinerary generation when online.
* Saves the generated schedule into the local DB and Trip Memory Store.
* Allows small follow-up edits to be handled **locally only** by Trip Brain.
* Demonstrates a **router pattern** and optional Cactus hybrid mode.

### 8.2 User experience & scope

From Screen 2:

* User chooses:

  * City (select from trip cities or free text).
  * Date (within trip range).
  * Time range for the day (e.g., 9:00–21:00).
  * Preferences (chips: “museums”, “food”, “nature”, “shopping”, etc.).
* Clicks **“Generate itinerary with AI”**.

Constraints:

* If **online**:

  * Cloud planner LLM generates a day plan in a structured JSON format.
* If **offline**:

  * Local Trip Brain provides a best-effort suggestion or asks the user to add events manually.
* No mapping APIs are used; only coarse place data and durations.

### 8.3 Router pattern

Router inputs:

```ts
type PlanIntent =
  | 'GENERATE_FROM_SCRATCH'
  | 'REGENERATE'
  | 'SMALL_EDIT'
  | 'QNA';

type PlanPayload = {
  tripId: string;
  dayId: string;
  city: string;
  date: string;
  availability: { start: string; end: string }; // 'HH:MM'
  preferences: string[]; // ['museums', 'coffee']
  userInstruction?: string;
};
```

Router pseudo-implementation:

```ts
async function routePlanningRequest(
  intent: PlanIntent,
  payload: PlanPayload,
  lm: LocalLMClient
): Promise<PlanResult> {
  const online = await isDeviceOnline();

  const needsCloud =
    online &&
    (intent === 'GENERATE_FROM_SCRATCH' || intent === 'REGENERATE');

  if (needsCloud) {
    // 1. Compute privacy-safe summary for cloud.
    const cloudRequest = buildCloudPlannerRequest(payload);

    // 2. Call remote planner.
    const cloudPlan = await callCloudPlanner(cloudRequest);

    // 3. Persist locally.
    await applyPlanToTrip(payload.tripId, payload.dayId, cloudPlan, lm);

    return {
      source: 'cloud',
      plan: cloudPlan,
    };
  }

  // 4. Local-only fallback: small edits or offline scenario.
  const localPlanText = await localReplanFromExisting(payload, lm);

  return {
    source: 'local',
    humanReadablePlan: localPlanText,
  };
}
```

**Cloud planner request:**

```ts
type CloudPlannerRequest = {
  city: string;
  date: string;
  availability: { start: string; end: string };
  highLevelPreferences: string[];
  coarseHistory: string[]; // e.g. ["Visited 1 museum earlier in the trip"]
};
```

No PII or exact reservation details are sent.

### 8.4 `applyPlanToTrip` (saving cloud output locally)

Cloud planner response example:

```ts
type CloudPlannerResponse = {
  activities: {
    title: string;
    startTime: string; // 'HH:MM'
    endTime: string;   // 'HH:MM'
    areaTag?: string;
    placeName?: string;
  }[];
};
```

`applyPlanToTrip` pseudo-logic:

```ts
async function applyPlanToTrip(
  tripId: string,
  dayId: string,
  plan: CloudPlannerResponse,
  lm: LocalLMClient
) {
  for (const activity of plan.activities) {
    const item: TripItem = {
      id: uuid(),
      tripId,
      dayId,
      type: 'ACTIVITY',
      title: activity.title,
      city: await db.getTripCityByDay(tripId, dayId),
      areaTag: activity.areaTag,
      startDateTime: composeDateTime(dayId, activity.startTime),
      endDateTime: composeDateTime(dayId, activity.endTime),
      meta: {},
    };

    await db.saveTripItem(item);

    // Update Trip Memory Store.
    await upsertTripItemToMemory(item, lm);
  }
}
```

This ensures all generated data feeds back into the local knowledge base.

### 8.5 `localReplanFromExisting` (offline / local edit mode)

```ts
async function localReplanFromExisting(
  payload: PlanPayload,
  lm: LocalLMClient
): Promise<string> {
  const items = await db.getTripItemsByDay(payload.dayId);
  const dayContext = items.map(canonicalizeItem).join('\n');

  const messages: Message[] = [
    { role: 'system', content: `
You are TripBrain, helping the user adjust an existing day's plan.
You must keep all existing activities but may reorder them and adjust times.

Rules:
1. Use only the provided activities; do not invent new ones.
2. Respect the user's overall time window (${payload.availability.start}–${payload.availability.end}).
3. Try to group activities that share the same area or are marked as near each other.
4. Reply with a clear human-readable timeline from morning to evening.
  `.trim() },
    {
      role: 'user',
      content:
        `Existing plan for ${payload.date} in ${payload.city}:\n${dayContext}\n\n` +
        `User preferences: ${payload.preferences.join(', ')}\n` +
        `User instruction: "${payload.userInstruction ?? 'Adjust the plan'}"`,
    },
  ];

  const result = await lm.complete({ messages, mode: 'local' });
  return result.response;
}
```

---

## 9. Implementation plan

This section is designed for LLM coding agents and human devs to parallelise work.

### 9.1 Milestone 0 – Project setup (Expo + Cactus)

**Owners:** Infra agent + React Native agent.

Tasks:

1. Create Expo app (prebuild so native modules work).
2. Install `cactus-react-native` and `react-native-nitro-modules`.
3. Implement a simple “Cactus Test Screen”:

   * Download model on start.
   * Show download progress and “ready” state.
   * Trigger a test completion and display response.

**Done when:**

* .apk/.ipa build runs on a real/virtual device.
* Cactus model downloads and answers a simple question locally.

---

### 9.2 Milestone 1 – Data & memory layer

**Owners:** Data agent.

Tasks:

1. Implement SQLite (or equivalent) schema for:

   * `Trip`, `DayPlan`, `TripItem`, `Place`, `MemoryChunk`.
2. Implement canonicalisation:

   * `canonicalizeItem(item: TripItem): string`.
3. Implement Trip Memory Store service:

   * `upsertTripItemToMemory(item, lm)`.
   * `search(tripId, queryEmbedding, topK)`.
4. Seed demo data:

   * One sample trip (e.g., Tokyo).
   * A handful of `Place` records with `near` links.

**Done when:**

* You can call a function to seed a trip and verify:

  * Items are saved.
  * MemoryChunks are created with embeddings via `embed()`.

---

### 9.3 Milestone 2 – Screen 1 (Trips list)

**Owners:** UI agent.

Tasks:

1. Implement `TripsListScreen`:

   * List `Trip` records with name + dates.
   * Tapping a trip navigates to `TripTimelineScreen`.
2. Implement **“New Trip”** flow:

   * Simple modal or screen to enter:

     * Name, start date, end date, primary city.
   * Creates a new `Trip` + `DayPlan`s for each date.
3. Show Cactus status:

   * If `!cactusLM.isDownloaded`, display “Downloading on-device AI…” with progress.
   * Otherwise, show “Trip Brain ready”.

**Done when:**

* User can create trips and open them.
* Cactus status visible on first screen.

---

### 9.4 Milestone 3 – Screen 2 (Timeline + hybrid planner)

**Owners:** UI agent + Planner agent.

Tasks:

1. Implement `TripTimelineScreen`:

   * Daily timeline view.
   * Day selector carousel/header.
   * Render `TripItem`s with different visuals for flights/hotels/activities.
2. Implement Settings for trip:

   * Edit home airport, primary city, date range.
3. Implement **“Generate itinerary with AI”** button:

   * Collect planner inputs (city, date, time range, preferences).
   * Call `routePlanningRequest('GENERATE_FROM_SCRATCH', payload, lm)`.
   * Show loading state and then updated timeline.

**Done when:**

* On a device with internet:

  * Pressing the button hits the cloud planner.
  * Cloud response is saved to DB and displayed in timeline.
* On offline mode:

  * Local fallback is used and user sees a best-effort message or local replan.

---

### 9.5 Milestone 4 – Screen 3 (Trip Brain chat)

**Owners:** Chat agent.

Tasks:

1. Implement `TripChatScreen`:

   * Chat list, input bar, send button.
   * Basic message store persisted per trip.
2. Implement **Trip Brain** API wrapper that:

   * Accepts `question: string` and `tripId`.
   * Runs the appropriate **Question → Pipeline** based on heuristics:

     * If question mentions “flight” or “hotel” and date words, call `answerFlightTimeQuestion`.
     * If question mentions “after” or “next”, call `answerAfterPlaceQuestion`.
     * If question mentions “free time” and time range, call `answerFreeTimeNearHotel`.
     * Otherwise, fallback to a generic Q&A using top-K memory chunks.
3. Ensure:

   * All queries use **local Cactus LLM** with the Trip Brain system prompt.
   * No cloud calls from Trip Brain (except optionally on explicit user request).

**Done when:**

* Judges can:

  * Go to a trip.
  * Open chat.
  * Ask “What time is my flight tomorrow?” and get a correct local answer offline.

---

### 9.6 Milestone 5 – Router & hybrid hero polish

**Owners:** Router agent.

Tasks:

1. Finalise `routePlanningRequest` and ensure:

   * Clear branches for cloud vs local.
   * Logging/telemetry for which branch was taken.
2. Optionally incorporate **Cactus hybrid mode**:

   * When performing local completions for planning, call:

     * `cactusLM.complete({ messages, mode: 'hybrid' })` so that if local fails, it falls back to OpenRouter.
3. Add UI badges:

   * “Planned using Cloud AI” vs “Planned locally”.
   * “Offline mode” indicator.

**Done when:**

* Implementation and UI clearly demonstrate the router pattern for Track 2.

---

### 9.7 Milestone 6 – Edge polish & demo script

**Owners:** All.

Tasks:

1. Ensure models are downloaded early and cached to avoid lag during demo.
2. Script a **1-minute demo video**:

   * Show model download status.
   * Show Magic Day planning with cloud.
   * Toggle airplane mode.
   * Show Trip Brain answering questions and reordering schedule offline.
3. Run test flows with:

   * Limited network.
   * Device lock/unlock.
   * App background/foreground.

---

## 10. Non-goals (for this hackathon)

To keep scope tight:

* No full map view or live navigation.
* No third-party booking APIs (flights/hotels).
* No calendar sync (Google/Apple).
* No advanced multi-user collaboration.
* No cross-trip meta-analytics.

Potential future extensions (not required for judging):

* A richer offline POI database and optional map view.
* Agentic tool-calling via Cactus to automate bookings or weather checks.
* Multi-day summarisation and automatic journalling features.
* Integration with third-party calendars for import/export.

---

## 11. References

* The hackathon’s mission emphasises building mobile apps that leverage on-device AI to solve real user problems and achieve total privacy, zero latency and offline capability.
* Participants must use the **Cactus SDK** and build with frameworks including React Native, Flutter and Kotlin.
* The hackathon’s themes include **Memory Master** (shared knowledge base) and **Hybrid Hero** (local/cloud routing).
* Example code for installing and using `cactus-react-native` shows how to download models and generate completions.
* The Cactus SDK supports text embedding via `embed()` and provides hooks for React Native.
* Hybrid mode allows completions that fall back to a cloud provider if local inference fails.
* Cactus also provides speech-to-text functions such as `transcribe()` using Whisper models.

```
::contentReference[oaicite:33]{index=33}
```
