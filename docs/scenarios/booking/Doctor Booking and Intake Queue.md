# Doctor Booking and Intake Queue

# Title / Flow : Doctor Booking and Intake Queue

## Narrative

AS a Doctor
I WANT to look at my intake queue
AND my patients that booked me
SO THAT I can process my upcoming patients

## Background:

GIVEN the system is online
AND I have patients in my Intake queue
AND I have patients without intakes yet

## Scenarios

### Scenario outline [HAPPY] : Doctor PROCESS their patients’ intakes

GIVEN I am on my intake queue dashboard
WHEN I PROCESS my patient
**THEN** my patient’s intake should be STATUS
AND my patient should be notified regarding their intake being STATUS

Example:

| PROCESS | STATUS |
| --- | --- |
| Gave OTL Link | in progress |
| Confirm | ready |
| Reject | need review |

### Scenario [HAPPY] : Payment is accepted after manual verification

GIVEN my booking is on “Pending verification”
WHEN my payment is accepted
**THEN** I should be enqueue to doctor’s intake queue

### Scenario [NEGATIVE] : ?

GIVEN ?
WHEN?
THEN ?
AND?

### Scenario [EDGE] : ?

GIVEN ?
WHEN ?
THEN ?