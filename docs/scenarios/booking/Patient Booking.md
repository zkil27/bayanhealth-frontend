# Patient Booking

# Title / Flow : Patient Booking

## Narrative

AS a Patient
I WANT to browse available doctors
SO THAT I can choose the doctor I want

## Background:

GIVEN the system is online
And I am on the Doctor’s Marketplace
And there are available doctors in the marketplace

## Scenarios

### Scenario [HAPPY] : Patient pays for booking a session with Doctor

GIVEN I have selected a Doctor
WHEN I completed the payment for the session fee
AND I sent the payment proof
**THEN** my booking should be “Pending verification”
AND the Admin should verify my payment proof

### Scenario [HAPPY] : Payment is accepted after manual verification

GIVEN my booking is on “Pending verification”
WHEN my payment is accepted
**THEN** I should be enqueue to doctor’s intake queue

### Scenario [NEGATIVE] : Payment is rejected after manual verification

GIVEN I have submitted a payment for my session
WHEN the payment is verified as insufficient
THEN I should be notified that the amount was incorrect
AND my session booking should remain "On Hold”

### Scenario [EDGE] : System Error

GIVEN I am paying for the session fee
WHEN I get failed booking error
THEN my money should not get deducted