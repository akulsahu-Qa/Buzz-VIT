# Buzz Hospital Workflow Platform

## V1 Workflow: Daily ECG Machine Check

A proof-of-concept workflow where:
1. You trigger a notification → it appears in the `#nurses` Buzz channel
2. The nurse clicks the link → opens a checklist page in the browser
3. The nurse ticks all 4 boxes and submits → a completion message appears in `#supervisors`

---

## Quick Start

### Step 1 — Set up environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Buzz channel IDs and bot private key
```

### Step 2 — Start the backend

```bash
cd backend
source venv/bin/activate        # or: python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt  # first time only
uvicorn main:app --reload --port 8000
```

### Step 3 — Start the frontend

```bash
cd frontend
npm install   # first time only
npm run dev
# Opens at http://localhost:5173
```

### Step 4 — Trigger the ECG workflow

```bash
curl -X POST http://localhost:8000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflow_type": "ecg-machine-check", "nurse_name": "Staff Nurse Jitendar"}'
```

Response includes `checklist_url` — this is the link posted to the Buzz nurses channel.

### Step 5 — Open the checklist

Open the `checklist_url` from the response in your browser. Check all 4 boxes and submit.

A completion message is automatically posted to your `#supervisors` Buzz channel.

---

## Buzz Setup (One-time)

### 1. Run the Buzz relay locally

```bash
git clone https://github.com/block/buzz
cd buzz
cp .env.example .env
docker-compose up -d
```

Connect the Buzz client app to `ws://localhost:3000`.

### 2. Create two channels in Buzz

In the Buzz app (inside your community):
- **`#nurses`** — Nursing team task notifications
- **`#supervisors`** — Supervisor oversight and completions

### 3. Get channel IDs

Right-click each channel → Channel Info → copy the channel ID.
Add them to `backend/.env`:
```
NURSES_CHANNEL_ID=<nurses channel id>
SUPERVISORS_CHANNEL_ID=<supervisors channel id>
```

### 4. Generate a bot keypair

```bash
# Install buzz-admin from the Buzz repo
cargo install --path crates/buzz-admin

# Generate keypair
buzz-admin generate-key --name workflow-bot
```

Add the private key to `backend/.env`:
```
BOT_PRIVATE_KEY=<your private key hex>
```

Add the bot's public key as a member of both channels in the Buzz app.

---

## Adding a New Workflow

The system is designed to be extended. To add, say, a "Medication Check" workflow:

1. **Create frontend config** (`frontend/src/workflows/medication-check/medicationCheckConfig.ts`):
   ```typescript
   export const medicationCheckConfig: WorkflowConfig = {
     workflowType: "medication-check",
     name: "Medication Check",
     tasks: [/* your tasks */],
     ...
   };
   ```

2. **Register frontend** (`frontend/src/workflows/workflowRegistry.ts`):
   ```typescript
   import { medicationCheckConfig } from "./medication-check/medicationCheckConfig";
   export const workflowRegistry = {
     ...existingRegistry,
     [medicationCheckConfig.workflowType]: medicationCheckConfig,
   };
   ```

3. **Register backend** (`backend/workflow_configs.py`):
   ```python
   MEDICATION_CHECK = WorkflowConfig(workflow_type="medication-check", ...)
   WORKFLOW_REGISTRY["medication-check"] = MEDICATION_CHECK
   ```

4. **Trigger it:**
   ```bash
   curl -X POST http://localhost:8000/api/workflows/trigger \
     -d '{"workflow_type": "medication-check", "nurse_name": "..."}'
   ```

**No UI code changes required.**

---

## Project Structure

```
Buzz-Vit/
├── backend/
│   ├── main.py              ← FastAPI app (3 endpoints)
│   ├── buzz_client.py       ← Buzz relay HTTP client (Nostr event signing)
│   ├── models.py            ← WorkflowExecution data model
│   ├── workflow_configs.py  ← All workflow task definitions
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.tsx                           ← Router (single /checklist route)
│       └── workflows/
│           ├── types.ts                      ← WorkflowConfig interface
│           ├── workflowRegistry.ts           ← Register workflows here
│           ├── WorkflowChecklist.tsx         ← Generic template (works for all)
│           ├── ChecklistItem.tsx             ← Animated task row
│           ├── WorkflowSuccess.tsx           ← Completion screen
│           └── ecg-check/
│               ├── ecgCheckConfig.ts         ← ECG-specific config
│               └── ECGChecklist.tsx          ← Thin wrapper
└── buzz-config/
    └── workflows/
        └── ecg_daily_check.yaml             ← Buzz workflow YAML
```
