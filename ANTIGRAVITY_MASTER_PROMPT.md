# ANTIGRAVITY MASTER BUILD PROMPT — WELLUP

You are the lead engineer for a 1-hour rapid-build competition.

Build the project now. Do not spend time explaining architecture before coding.

## PRODUCT

Name: WellUP

SDG: SDG 3 — Good Health & Well-being




Core promise:
> Understand your health without feeling awkward asking.

It provides general health education and practical information. It is NOT a doctor and must NOT diagnose.

## TIME CONSTRAINT

We have approximately 1 hour.

Therefore:
- prioritize working functionality
- use simple architecture
- avoid unnecessary dependencies
- avoid overengineering
- get `/api/chat` working early
- get deployment-ready early
- polish only after the core works

## STACK — DO NOT CHANGE

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide
- Supabase Auth + PostgreSQL + Storage
- Gemini API using the official Google GenAI SDK
- Vercel

Do NOT add FastAPI.
Do NOT create a separate backend server.
Use Next.js Route Handlers.

## FIRST IMPLEMENT

1. Create/inspect project structure.
2. Build the chat UI.
3. Build `POST /api/chat`.
4. Build `GET /api/health`.
5. Connect Gemini server-side.
6. Add the health-safety system prompt.
7. Test a real question.
8. Make it deployment-ready.
9. Then add high-value features.

## API

### POST /api/chat

Request:
```json
{
  "message": "Why do periods hurt?"
}
```

Response:
```json
{
  "response": "..."
}
```

Optional fields:
```json
{
  "message": "...",
  "conversationId": "...",
  "language": "en"
}
```

### GET /api/health

Return:
```json
{
  "status": "ok"
}
```

Gemini API key must NEVER reach client-side code.

Use environment variables.

## ENV

Create `.env.example`:

```text
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not put real keys in source code.

## UI

Create a polished, modern health-tech interface.

Do not make it look like ChatGPT.

Style:
- calm
- clean
- trustworthy
- youthful
- gender-neutral
- accessible
- rounded cards
- subtle shadows
- restrained animations

Create a landing/empty state with:
- WellUP logo/name
- short explanation
- Guest / Sign in options
- quick starter questions

Main chat:
- message bubbles
- streaming/loading state if easy
- error state
- clear conversation
- language selector
- "Explain simply"
- "I don't know what to ask"

## THEME SYSTEM

CRITICAL:
Never hard-code the main colors across components.

Use CSS variables.

Default:

```css
:root {
  --primary: #7CBF8A;
  --primary-dark: #2F6B45;
  --accent: #F4A261;
  --background: #F7FAF5;
  --surface: #FFFFFF;
  --text: #26352B;
  --muted: #718078;
  --border: #DCE7DE;
}
```

Add Green, Blue and Purple theme presets.

Make theme switching easy.

## HEALTH CATEGORIES

The AI automatically detects:
- Body & Puberty
- Menstrual Health
- Sexual & Reproductive Health
- Allergies
- Hygiene
- Nutrition
- Sleep
- Physical Well-being
- Mental Well-being
- Relationships
- General Health
- Health Resources

Do not force users to select a category.

## SIGNATURE FEATURE: HEALTH WORDS

This is a major differentiator.

When a user describes a health issue without knowing terminology, the AI should naturally introduce useful medical words.

Example:
User:
"I have pain in the lower area where periods happen."

Assistant may explain:
"The uterus is an organ involved in menstruation..."

The word "uterus" should be highlighted/clickable.

Clicking opens a small popover:
- simple definition
- what it does
- where it is
- related terms

IMPORTANT:
Do not present a terminology suggestion as a diagnosis.

Implement this with structured AI output if practical.

If structured output becomes unreliable under time pressure, use a lightweight parsing format such as:

```text
[HEALTH_TERM: uterus | The uterus is an organ...]
```

and convert it safely in the frontend.

## MULTILINGUAL

Support:
- English
- Hindi
- Gujarati

The language selector should affect AI response language.

Keep medical terminology understandable.

## AI SYSTEM PROMPT

Use a strong server-side system prompt.

Core behavior:

- You are WellUP, a health-awareness educator.
- Give general health education.
- Use simple language.
- Be respectful and non-judgmental.
- Do not diagnose.
- Do not claim certainty about a condition.
- Do not prescribe medication or dosage.
- Do not invent medical facts.
- Do not fabricate sources.
- If uncertain, say so.
- Provide credible resources when appropriate.
- Recommend qualified healthcare professionals when the situation requires assessment.
- For emergencies, prioritize immediate local emergency services or the nearest emergency department.
- Never invent emergency phone numbers or hospitals.
- Automatically recognize useful medical terminology and explain it naturally.
- When the user asks an unrelated question, briefly redirect toward health/well-being unless it is harmless context.
- Do not collect unnecessary personal information.

Response structure when useful:

1. Direct answer
2. Explanation
3. What the user can do
4. When to seek professional help
5. Health words
6. Sources

Do not force all sections into every answer.

## SAFETY

If user asks:
"Do I have X?"

Never answer:
"Yes, you have X."

Instead:
"I can't diagnose you from a chat, but I can explain what X commonly means and what signs are worth discussing with a healthcare professional."

For emergencies:
- tell user to seek urgent/emergency help
- provide verified local resource only if known
- never invent a number

## AUTH

Two modes.

### Guest
- no login
- chat immediately
- temporary conversation history in browser
- no silent cloud storage

### Logged in
- Supabase Auth
- optional persistent data
- explicit storage consent

Do not force login for the core chatbot.

## ONBOARDING

Keep it short.

Only for logged-in users.

Step 1:
- nickname
- age range
- language

Step 2:
- allergies (optional)
- conditions (optional)
- medications (optional)
- health notes (optional)

Step 3:
- topics of interest

Step 4:
- storage consent

Do NOT make users fill a giant medical questionnaire.

## SUPABASE

Use Supabase for:
- Auth
- database
- Storage

Minimum tables:
- profiles
- health_context
- conversations
- messages
- reports
- appointments

Enable RLS for user-owned data.

Guest conversations stay in browser.

## PDF MEDICAL REPORTS

Implement only if the core product is already working.

Logged-in users can upload a PDF.

Store the file in Supabase Storage.

Then:
- read/analyze the report
- summarize it
- extract explicitly stated facts
- identify dates
- identify possible appointment dates

Never infer a diagnosis from ambiguous content.

Before saving extracted medical facts as persistent memory, ask for confirmation.

If PDF processing threatens the 1-hour deadline:
CUT IT.

A working chatbot is more important.

## APPOINTMENTS

If a date/time is clearly found:
show:

"Possible appointment found — add reminder?"

For MVP:
- store appointment
- show upcoming appointment card

Do not build complicated push infrastructure.

## SOURCES

When sources are available, show credible references.

Prefer:
- WHO
- government/public-health resources
- established medical organizations

Never fabricate a URL.

## FEATURE PRIORITY

P0:
- chat
- Gemini
- `/api/chat`
- `/api/health`
- guest mode
- safety
- deployment

P1:
- Health Words
- language switch
- sources
- explain simply
- clear chat
- theme switch

P2:
- Supabase auth
- saved conversations
- PDF reports
- health profile

P3:
- appointments
- notifications
- advanced polish

If time becomes short:
CUT P2/P3 BEFORE BREAKING P0/P1.

## DO NOT

- build a generic ChatGPT clone
- expose API keys
- diagnose
- add unnecessary AI providers
- build a vector database unless absolutely necessary
- add unnecessary dependencies
- create microservices
- spend 20 minutes on animations
- make login mandatory
- store guest medical data remotely

## FINAL CHECKLIST

Before saying complete, verify:

[ ] npm build works
[ ] `/api/health` works
[ ] `/api/chat` works
[ ] Gemini response works
[ ] API key is server-side
[ ] Guest chat works
[ ] safety behavior works
[ ] mobile layout works
[ ] theme variables work
[ ] no obvious console errors
[ ] Vercel deployment can work
[ ] README includes setup and API contract

Start coding immediately.
