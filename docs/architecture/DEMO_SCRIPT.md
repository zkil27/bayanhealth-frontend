# Demo script — on-demand consultation, end to end

Purpose: a recordable walkthrough of the patient and doctor paths, from an
on-demand booking to a released prescription. Written so a viewer can follow what
each side sees, and so the person driving knows what is real, what is a stand-in,
and what will look wrong if it goes wrong.

Environment: **`dev` only**. Nothing here is staging-qualified, canary-authorized,
or production-enabled.

---

## Before you record

Two accounts, two browser profiles (or one normal and one incognito) so the
sessions do not share cookies:

| Role | Requirement |
|---|---|
| Patient | Cognito user in the `patient` group, with a **saved profile name** (`PUT /v1/patients/me/profile`) so the doctor's pool card shows a name instead of `Ref ABC123` |
| Doctor | Cognito user in the `doctor` group, KYC **`approved`** — otherwise start-consultation and complete-consultation both refuse |

Preflight, read-only, from `backend/`:

```bash
DYNAMODB_APP_CORE_TABLE=bayanhealth-dev-app-core ENVIRONMENT=dev \
AWS_REGION=ap-southeast-1 AWS_REGION_NAME=ap-southeast-1 \
npx tsx src/tools/cds-demo-readiness.ts
```

Expect `0 blockers`. It warns that `generationMode` is `enabled` for **all**
actors — correct for a synthetic dev demo, and to be rolled back afterwards with
`infra/scripts/cds-operator-recovery.sh mode-disable`.

Also confirm, because each one silently changes what the demo shows:

- `ON_DEMAND_POOL_ENABLED = true` on **three** Lambdas — `intake-queue`, `payments`,
  and `payment-proof` — not one. `intake-queue` serves the pool routes; `payments`
  and `payment-proof` both bundle `finalizeBookingAfterPaymentConfirm`, which is
  what decides whether a paid booking enters the pool at all. This is exactly the
  bug ADR-20260809-04 fixed: with the flag on `intake-queue` only, every on-demand
  booking was auto-assigned at payment time, the pool read "0 open requests", and
  the patient's Finding step was skipped. Check all three:

  ```bash
  for fn in intake-queue payments payment-proof; do
    echo -n "$fn -> "
    aws lambda get-function-configuration \
      --function-name bayanhealth-dev-$fn --region ap-southeast-1 \
      --query "Environment.Variables.ON_DEMAND_POOL_ENABLED" --output text
  done
  ```

  All three must print `true`. If the pool section renders nothing at all rather
  than an empty state, the flag is off on `intake-queue`.
- `VIDEO_PROVIDER = daily` on the bookings and payments Lambdas (`dev` default per
  ADR-20260819-01). The video card now comes from `<ConsultationVideo />`, gated on that
  provider switch and on the booking's own `confirmed`/`in_progress` status — not on a
  manually-set demo URL. If the provider reports unavailable, the card renders a
  chat-only state instead of disappearing.
- `CDS_SOAP_MODEL_PRESET` / `CDS_PATIENT_MODEL_PRESET` = `qwen3.6-plus`.

---

## Patient path

### 1. Book, on-demand

`/booking` → **Consult** → `/booking/createBooking`.

The patient picks a consultation service and doctor preferences, then **Book**.
This route is the on-demand path: it sends `bookingMode: "on_demand"`, so the
request will be broadcast to the whole approved-doctor pool once paid.

> The scheduled path is a different route: `/booking/search` → pick a doctor →
> pick a published slot. Do not mix them in one recording; they end in different
> places on purpose.

Lands on `/booking/getBooking/{bookingId}` — the booking page that carries the
whole rest of the patient journey.

### 2. Intake

The wizard opens on **Intake**. Fill it in and submit.

Worth narrating: the three red-flag questions are **three-state** — yes / no /
unanswered. The platform never infers a negative from an unanswered question, and
the doctor's view shows "not asked" distinctly from "No".

### 3. Pay

The wizard advances to **Payment**. One button, `Pay ₱500.00`. No card fields, and
the screen says why: the environment uses the simulated `ledger` provider, so no
card data is collected and nothing is charged. This is the temporary stand-in
while PayRex remains disabled and unqualified.

The hold moves the booking `pending_payment → confirmed`, which is what puts it in
the pool.

### 4. Wait for a doctor

The wizard shows **Waiting for a doctor** with a `Live` badge:

- a ticking elapsed timer (`Waiting 1:04`)
- "Your request is visible to every verified doctor on BayanHealth right now. The
  first one to accept it becomes your doctor…"
- "Your payment is on hold, not charged. If you cancel before a doctor accepts,
  the hold is released in full."
- a **Cancel request** button → confirm dialog → **Yes, withdraw it**

No estimated wait is shown anywhere, deliberately: there is no queue depth or
acceptance-rate history to compute one from.

Leave this tab open and switch to the doctor.

---

## Doctor path

### 5. See and accept the request

`/doctor`. Under **Open consultation requests**, a card showing: service, channel,
fee, **the patient's name**, when it was requested, and the chief-complaint
excerpt (bounded to 160 characters).

The name before acceptance is a deliberate product decision (ADR-20260808-02):
a clinician deciding whether to take a case sees whose case it is. Still withheld
pre-acceptance: patient id, date of birth, contact details, and the full intake
body.

Press **Accept**. The claim is atomic — if two doctors press at once, exactly one
wins and the other sees "Another doctor accepted that request first."

### 6. Read the full intake

The booking now appears in the doctor's board. If the patient submitted their
intake before you accepted, it lands directly in **ready intakes** — that is what
ADR-20260809-04 fixed; it used to land in "booking requests", where the only
control was "Confirm & Send Intake" and there was no way to start the
consultation at all.

Open **ready intakes** → **View**. This is the full `[S] Subjective` view: chief complaint, the patient's
verbatim quote, the three-state red-flag screening, all seven OLDCART fields,
current medications, allergies, and history — with "Not answered" where the patient
left something blank.

### 7. Start the consultation

The drawer also carries a **Consultation access** panel: **Join video call** and
**Open chat room** are both available now. Chat opens as soon as a doctor is
assigned (ADR-20260809-05), so you can message the patient before starting — worth
showing on camera, because it is the moment the two participants first have a
channel to each other.

Pre-consult chat is polled rather than realtime: messages arrive within a few
seconds and there is no typing indicator or presence, because those are keyed on a
consultation session that does not exist until you start. The room says so.

In the drawer footer, **Start Consultation** → the room at
`/consultation/room/{bookingId}`.

This is the single call that moves the booking to `in_progress`, which unlocks
chat and creates the canonical CDS session the post-consult Assessment depends on.

### 7b. Message before starting (optional, but a good beat)

From the drawer, **Open chat room** and send the patient a message before starting
the consultation. Switch to the patient tab, open the booking, and follow **Open
chat room** — the message is there, and they can reply. This is the pre-consult
phase: chat is open, the video link works, and the consultation has not started.

### 8. Chat and video, both sides

The room shows: "Consultation in progress" with the consultation id, **End
consultation**, a **Video consultation** card with **Join video call**, and the
chat panel.

Switch to the patient tab. The booking page now shows **Your consultation has
started** → **Join consultation**, and the same **Video consultation** card. Send a
message each way so the recording shows real two-way chat.

The video call is a per-consultation Daily room, created lazily on the first
`POST .../video-session` call and scoped to this Booking — not a shared stand-in
room. The join credential is held in memory only and never printed as text on
either side (ADR-20260819-01).

### 9. End the consultation

Doctor presses **End consultation**. That one call captures the payment, writes the
doctor's payout, ends the canonical session, initializes the Assessment
aggregates, and ingests the intake as the consultation's first clinical source.
The doctor is redirected into the post-consult workspace.

Switch to the patient tab: the wizard now reads **Consultation complete** —
"your doctor is writing up their findings", "you do not need to stay on this page",
and "anything your doctor shares appears here".

---

## Post-consultation: AI-assisted clinical work

`/doctor/post-consultation/id?consultationId=…&bookingId=…`

> **Naming note, worth getting right on camera.** There is no single "generate the
> SOAP" button, and that is by design, not an omission. Assessment-first gating
> (ADR-20260703-01) splits SOAP: **S** and **O** come from the patient's own intake
> and are shown in the **Patient Details** tab; **A** is the physician's own act;
> **P** and everything downstream are AI-generated only *after* the Assessment is
> confirmed. The old single-shot `POST /v1/cds/soap` route is retired and returns
> `410`. Describe it as "AI organises the subjective and objective, the physician
> owns the assessment, then AI drafts the plan" — that is what actually happens.

### 10. Review S and O

**Patient Details** tab shows the real submitted intake — safety screen,
allergies, medications, history. Nothing here is fabricated.

*Skip the **Audio Trail** tab on camera: it is mounted without a source and is a
permanent empty state.*

### 11. Confirm the Assessment

In **Post-consult Assessment**:

1. Optionally **Start fresh evaluation** in *Diagnosis candidates*, search, view
   the CPG Preview for a candidate, and select it.
2. Type the diagnosis and **Save manual entry**. The UI states that typing never
   confirms anything.
3. **Confirm exact saved Assessment** — this confirms the exact text that was
   saved, not what is currently in the box.

### 12. Request a generation token

**Request current-state token**. The token is ES256-signed over KMS, held in
memory only, and expires. Until it is held, every generation button stays disabled
and the screen says so.

### 13. Generate

Press **Generate Patient education**, then **Generate Prescription**.

**What to watch for.** If the provider fails a gate, times out, or returns an
empty completion, the pipeline falls back to a deterministic template and still
returns HTTP 200. For a prescription that fallback reads
`genericName: "physician selection required"`, everything else `"not specified"`.
If you see that, the model call did not succeed — regenerate rather than release
it. The patient-facing card also refuses to present it as medicine, but the
physician is the real gate.

### 14. Finalize, then release

Per artifact: enter a signer name, tick the review acknowledgement, draw a
signature, **Finalize after review**. Finalizing is *not* release — the screen says
so.

Then **Confirm separate patient release**, per artifact. Release is deliberately
one artifact at a time; there is no "release everything" action.

*Artifact payloads currently render as raw JSON in this workspace. Known rough
edge; the clinical content is correct, the presentation is not.*

---

## Back to the patient: the payoff

Reload the patient's booking page. It now shows, in order:

1. **Your care guide** — the released patient education: title, "Reviewed by your
   doctor", grouped sections, an English/Filipino toggle when the article is
   bilingual, a "When to seek urgent care" list, and the mandatory citation.
2. **Your prescription** — each medicine with dose, how to take it, how often, for
   how long, and instructions as separate labelled fields, plus any notes from the
   doctor. It states plainly that this is a record of what was prescribed and
   **not** a signed, dispensable document.

Both cards render nothing until the physician releases them, so the order of
operations in the recording matters: release first, then show the patient.

---

## Known rough edges — decide in advance whether to show them

| Thing | What happens |
|---|---|
| Prescription is not dispensable | No prescriber identity, licence number, or signature. Stated on the card. |
| `/verify` public verification | Live, but the writer is retired, so it can only answer "not verified". Do not demo. |
| `/doctor/moonlight` | Hardcoded empty queue. Do not click. |
| Audio Trail tab | Permanent empty state. |
| Artifact JSON in the workspace | Payloads shown as raw JSON to the physician. |
| Drug catalog | Not consulted during prescription generation; the payload is validated for shape, not grounded in the drug data. |
| No pool expiry | An unclaimed request waits forever unless the patient cancels. |
| Two "accept" verbs | Pool **Accept** and board **Confirm & Send Intake** are different actions with no on-screen explanation. Only the second appears when the patient has not submitted intake. |
| Pre-consult chat is polled | No typing indicator or presence until the consultation is started; messages arrive within ~3s. |
| Chat closes after completion | The conversation is not readable once the booking is `completed`. |
| `/patient/records` | Shows the same booking list twice, under two headings. |

---

## After the demo

```bash
infra/scripts/cds-operator-recovery.sh mode-disable
```

That closes protected generation again. Leaving `generationMode: enabled` open to
all actors is a demo posture, not a resting state.
