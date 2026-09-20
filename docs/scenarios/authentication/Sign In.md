# Signs in

# Title / Flow : Signs in

## Narrative

AS a registered user
I WANT to sign in with my email and password
SO THAT I can access my account and personal data

## Background:

GIVEN the system is online
AND I have a verified email address

## Scenarios

### Scenario Outline [HAPPY] : Role based Successful Login

GIVEN I am registered as a ROLE
WHEN I submit valid credentials
THEN I reach the LANDING_PAGE

Examples:

| Role | Landing_page |
| --- | --- |
| Patient | Patient Home |
| Doctor | Doctor Dashboard |
| Admin | Admin Panel |

### Scenario [NEGATIVE] : Invalid Credentials

GIVEN I am a registered user
WHEN I submit invalid credentials
THEN I get an inline "incorrect credentials"
AND email form should not reset

### Scenario [EDGE] : Multiple Login attempts

GIVEN I have 4 previous failed sign in attempts
WHEN I fail my 5th attempt
THEN I get a message "Please wait for 5 minutes before sign in again"