# Admin Booking Verification

# Title / Flow : Admin Booking Verification

## Narrative

AS an Admin
I WANT to look on the list of Patient’s payment list
SO THAT I can verify Patients’ Bookings

## Background:

GIVEN the system is online
And there are Patients waiting for their booking approvals

## Scenarios

### Scenario [HAPPY] : Admin approves Patient’s Payment Proof

GIVEN I verify a Patient Proof
WHEN I approve their booking approval
**THEN** they should be notified and enqueue to Doctor’s intake queue

### Scenario [HAPPY] : Patient waits for Doctor to initiate consultation session

GIVEN I have scheduled session with Doctor
WHEN I sent my preferred communication application
**THEN** Doctor should initiate our session with my preferred communication application

### Scenario [NEGATIVE] : Admin disapprove Patient’s Payment Proof

GIVEN I verify a Patient Proof
WHEN I disapprove their booking approve because of REASON
**THEN** they should be notified that their booking approval is “On Hold” because of REASON

Example:

| REASON |
| --- |
| Insufficient Payment |
| Incorrect Bank? |
| ? |

### Scenario [EDGE] : ?

GIVEN ?
WHEN ?
THEN ?