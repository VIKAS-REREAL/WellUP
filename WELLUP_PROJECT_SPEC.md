# WellUP — Next Gen Chatbot Arena
## 1-Hour Vibe-Coding Build Specification

### Competition
- Event: Next Gen Chatbot Arena
- SDG: **SDG 3 — Good Health & Well-being**
- Build window available to team: approximately **1 hour**
- Final product: public web chatbot + reachable API endpoint
- Must be deployable on Vercel
- Team: Vikas + Vidhi + Aliraza

### Product
**Working name:** WellUP  
**Alternative:** Carava

**Core statement:**
> WellUP helps teenage and curious individuals understand their health and well-being through a private, accessible, AI-powered health-awareness assistant.

### Target users
- Teenagers
- Curious individuals who want understandable health information
- Users who may feel uncomfortable asking another person basic health questions

### Core principle
WellUP is a **health-awareness and education assistant, not a doctor and not a diagnostic system**.

It can explain health topics, identify useful terminology, organize information, provide practical general guidance, and direct users to appropriate professional/emergency resources.

---

# 2. Technology — LOCK THIS

Use the simplest modern stack that works well with Antigravity and Vercel:

### Frontend + backend
- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- Next.js Route Handlers for API endpoints

### AI
- **Gemini API via the official Google GenAI SDK**
- Prefer Gemini only for the competition MVP.
- Do NOT add NVIDIA unless there is a concrete reason during the event.

### Backend/data/auth
- **Supabase**
  - Auth
  - PostgreSQL
  - Storage
  - Row Level Security

### Deployment
- **Vercel**
- Keep frontend and backend/API in the same Next.js project.

### Icons
- **Lucide**

### Important
Do not introduce unnecessary services, databases, authentication providers, state-management libraries, or UI frameworks.

---

# 3. Required API

The competition requires a reachable external API.

Implement:

### `POST /api/chat`

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

Support optional context fields if useful:

```json
{
  "message": "...",
  "conversationId": "...",
  "language": "en"
}
```

Also implement:

### `GET /api/health`

Response:
```json
{
  "status": "ok"
}
```

The API must:
- work without exposing the Gemini key
- validate input
- return useful errors
- remain focused on SDG 3
- use server-side Gemini calls

---

# 4. Authentication model

Two modes:

## Guest
- No login required.
- User can immediately chat.
- Conversation history exists only in the browser.
- Use browser storage for temporary chat context.
- Do not upload/store medical documents for guest users unless a clearly explained temporary mechanism is implemented.
- Show an anonymous/private notice.

## Logged-in
- Supabase Auth.
- User can opt into saving health information.
- Conversations can be stored.
- Medical reports can be stored in Supabase Storage.
- User can manage/delete saved information.

### Important privacy rule
Do NOT silently save sensitive health information.

Default:
**storage OFF**

If user chooses storage:
- clearly explain what is saved
- clearly explain why
- allow deletion
- protect records with Supabase RLS

---

# 5. Onboarding

Do NOT create a long medical form.

For logged-in users, use a short multi-step onboarding flow.

### Step 1 — About you
- Preferred name/nickname
- Age range
- Preferred language

Age range should be broad rather than forcing exact DOB.

### Step 2 — Health context
Optional:
- Known allergies
- Existing conditions
- Current medications
- Important health notes

### Step 3 — Preferences
- Topics they want to learn about
- Response language
- Simple / standard explanation preference

### Step 4 — Privacy
Clearly ask:
> Do you want WellUP to remember the information you provide?

Options:
- Keep private / don't save
- Save to my account

Never make storage look mandatory.

---

# 6. Guest onboarding

Keep it almost zero-friction.

First screen:
> **Welcome to WellUP**
> Ask health questions without feeling awkward.

Then:
- Continue as Guest
- Sign in / Create account

Guest mode should immediately open the chatbot.

---

# 7. Main health categories

The AI should automatically classify questions.

Possible categories:

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

The user does NOT have to select a category.

If useful, show the detected category subtly in the answer UI.

---

# 8. Signature feature — Health Terminology Helper

This is a core differentiator.

Problem:
Users often describe a body/health issue without knowing the correct medical term.

Example:
> "I have pain in the lower area near where periods happen."

The assistant can naturally introduce useful terminology:

> "The **uterus** is an organ where a pregnancy can develop. If you meant pain in the uterus area, ..."

The term **uterus** becomes a clickable/highlighted health term.

When clicked, open a small definition card/popover:
- Simple definition
- What it does
- Where it is
- Related terms
- "Learn more" if available

Do NOT claim that the highlighted term is definitely the user's diagnosis or exact affected body part.

The feature should be called something like:
**Health Words**
or
**Understand the term**

AI should return structured terminology metadata when possible:

```json
{
  "term": "uterus",
  "simpleDefinition": "...",
  "context": "..."
}
```

---

# 9. Other core features

### A. Myth vs Fact
User can ask:
> "Is it true that...?"

Or click:
**Myth / Fact**

Response:
- Myth or Fact
- Short explanation
- What is actually known
- Source/reference

### B. "I don't know what to ask"
Button generates safe starter questions based on the user's selected/known interests.

Example:
> "Not sure what to ask?"
> - What changes happen during puberty?
> - How can I manage common allergies?
> - What should I know about menstrual hygiene?

### C. Explain simply
Button:
**Explain simply**

Rewrites the answer in easier language without changing meaning.

### D. Symptom education mode
The bot can explain:
- common possibilities
- general information
- warning signs
- when professional evaluation may be appropriate

It must NOT diagnose.

Example:
> "There can be several causes of itching. I can't determine the cause from chat alone..."

### E. Language support
Priority:
1. English
2. Hindi
3. Gujarati

The user should be able to switch language.

AI should preserve medical terms while explaining them in the selected language.

### F. Sources
Health answers should provide sources when practical.

Prefer authoritative sources such as:
- WHO
- Government/public-health resources
- Established medical institutions
- Other credible health organizations

Never invent a source or URL.

---

# 10. Medical reports / PDFs

Logged-in users can upload:
- PDF medical reports
- relevant health documents

Workflow:
1. Upload to Supabase Storage.
2. Save metadata in database.
3. Extract/read the report with Gemini or an appropriate PDF/text processing path.
4. Generate a concise user-readable summary.
5. Extract useful structured facts only when clearly present:
   - allergies
   - conditions
   - medications
   - dates
   - appointments
   - test/report names
6. Ask for confirmation before treating extracted information as persistent profile memory.

### Important
Do not infer diagnoses from ambiguous report text.

If the report says:
> "Allergy: Penicillin"

store:
`Penicillin allergy`

If it does NOT explicitly say something, do not invent it.

### Report UI
Show:
- File name
- Upload date
- Summary
- Extracted health facts
- Delete button

---

# 11. Appointment/reminder feature

If a user provides an appointment date/time or the uploaded document clearly contains one:
- detect it
- show it as a possible reminder

Example:
> "I found an appointment on 18 Sept at 4:00 PM. Add reminder?"

For the 1-hour MVP:
- Store appointment data for logged-in users.
- Show upcoming appointments in the dashboard.
- Use browser reminder/notification only if it can be implemented reliably.
- Do NOT build a complicated push-notification infrastructure during the competition.

If reminder notifications become risky for time, prioritize:
**appointment extraction + dashboard reminder card**.

---

# 12. Safety behavior

System prompt must enforce:

### Never
- diagnose
- claim certainty about a disease
- pretend to be a doctor
- prescribe medication
- invent dosage
- invent medical facts
- provide dangerous treatment instructions
- fabricate sources
- reveal private user data

### For difficult medical cases
Use language like:
> "I can give general information, but this needs evaluation by a qualified healthcare professional."

### For emergencies
The bot should recognize obvious emergency situations and prioritize immediate help.

The response should:
1. Clearly state that this may require urgent/emergency help.
2. Tell the user to contact their local emergency service or go to the nearest emergency department.
3. Avoid pretending it can arrange emergency treatment.
4. If the user's location is known and a verified emergency resource is available, provide it.
5. Do not invent local phone numbers or hospitals.

For India, use only verified emergency information if included in the deployed app.

---

# 13. Response format

Prefer a consistent structure:

### Short answer
Directly answer the question.

### What it means
Explain the relevant health concept.

### What you can do
Give safe, practical general guidance.

### When to get professional help
Only when relevant.

### Health words
Highlight useful medical terminology.

### Sources
Show credible sources when available.

Do not force every section onto every response.

---

# 14. UI

Design language:
- modern health-tech
- calm
- trustworthy
- youthful but not childish
- gender-neutral
- clean
- accessible
- rounded cards
- subtle animation
- strong typography

Avoid:
- hospital/clinical dashboard look
- excessive pink/blue gender coding
- childish illustrations
- generic ChatGPT clone

### Main screens

1. Landing / welcome
2. Guest vs Login
3. Optional onboarding
4. Chat
5. Health term popover
6. Myth/Fact
7. Profile / health memory
8. Reports
9. Settings/privacy

For the 1-hour MVP, prioritize:
**Chat → Health Words → Language → Safety → Login/Guest → basic report upload**

---

# 15. Theme system

All colors must be CSS variables.

Example:

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

Create theme variants:
- Green
- Blue
- Purple

Theme switching should change CSS variables only.

This allows the team to choose the final visual style shortly before the demo.

---

# 16. Database — minimum schema

Use Supabase only for logged-in persistent data.

Suggested tables:

### profiles
- id
- display_name
- age_range
- preferred_language
- storage_consent
- created_at

### health_context
- id
- user_id
- allergies
- conditions
- medications
- notes
- updated_at

### conversations
- id
- user_id
- title
- created_at
- updated_at

### messages
- id
- conversation_id
- role
- content
- created_at

### reports
- id
- user_id
- file_path
- file_name
- summary
- extracted_facts
- report_date
- created_at

### appointments
- id
- user_id
- title
- appointment_at
- source_report_id
- created_at

Enable RLS for all user-owned records.

---

# 17. What NOT to build in the 1-hour competition

Do NOT spend time on:
- complex admin panels
- custom AI model training
- vector database/RAG unless absolutely necessary
- elaborate notification infrastructure
- social features
- user-to-user messaging
- payments
- analytics dashboards
- complicated animations
- excessive onboarding
- multiple AI providers
- complicated microservices

A reliable 5-feature product beats a broken 20-feature product.

---

# 18. Competition priorities

### P0 — MUST WORK
- Web UI
- Gemini chat
- `/api/chat`
- `/api/health`
- guest mode
- basic Supabase auth
- safety system prompt
- deployment
- public URL

### P1 — HIGH VALUE
- health terminology highlighting
- multilingual responses
- source/reference display
- symptom education mode
- delete conversation
- theme switching

### P2 — ONLY IF TIME REMAINS
- medical PDF upload
- report summarization
- extracted health facts
- appointment extraction
- dashboard

### P3 — CUT IF NECESSARY
- push notifications
- advanced profile customization
- advanced animations
- complex analytics
- advanced RAG

---

# 19. Final competition mindset

The evaluator may send standardized prompts directly to the API.

Therefore:
- the API response must be strong even without the UI
- answers must remain SDG-3 focused
- the system prompt is extremely important
- don't optimize only for the presentation demo

The official challenge scoring heavily rewards:
- SDG relevance
- response quality
- accuracy
- technical functionality
- responsible AI
- UX
- innovation

Build for those criteria.
