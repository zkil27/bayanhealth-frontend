# Admin Manages Signs Up

# Title / Flow : Admin Manages Signs Up

## Narrative

AS an Admin
I WANT to ACTION a registering user as ROLE
SO THAT I they can have an account in the application

Example:

| ROLE | ACTION |
| --- | --- |
| Doctor | Approve/Reject |
| Patient | Approve |

## Background:

GIVEN the system is online

## Scenarios

### Scenario [HAPPY] : Admin verifies Doctor’s application

GIVEN I have a Doctor’s application
WHEN I want to verify the person
**THEN** I should be able to look into the submitted Doctor’s credentials

### Scenario [HAPPY] : Admin approves Doctor’s application

GIVEN I have a Doctor’s application
WHEN I approve the application
**THEN** it should redirect me to create a new Doctor’s account
AND it should be prefilled with Doctor’s information

### Scenario [NEGATIVE] : ?

GIVEN ?
WHEN?
THEN ?
AND ?

### Scenario [EDGE] : ?

GIVEN ?
WHEN ?
THEN ?