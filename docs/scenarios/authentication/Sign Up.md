# Signs up

# Title / Flow : Signs up

## Narrative

AS a non-registered user
I WANT to register with my email and password
AND choose my ROLE
SO THAT I can create an account in this app

Examples:

| Role |
| --- |
| Patient |
| Doctor |

## Background:

GIVEN the system is online

## Scenarios

### Scenario Outline [HAPPY] : Role based Successful Registration

GIVEN I am registering as a ROLE
WHEN I submit valid credentials
AND I verified my email address
THEN I should reach the PAGE

Examples:

| Role | Page |
| --- | --- |
| Patient | Patient Home |
| Doctor | Wait for approval Page |

### Scenario Outline [HAPPY] : Doctor Specific Registration requirements

GIVEN I registering as Doctor
WHEN I attach my required documents
AND accept the terms and conditions
AND gave my schedule and availability
THEN I should be able to submit my Doctor application form
AND wait for Admin’s approval for my account

### Scenario Outline [NEGATIVE] : Registration Error

GIVEN I am non-registered user registering as a ROLE
WHEN I submit ITEM
THEN I get an inline MESSAGE
AND forms should not reset

| Item | Message |
| --- | --- |
| Wrong Credentials | Incorrect Email/Password |
| Invalid License ID | Invalid License ID |
| ? | ? |

### Scenario [EDGE] : ?

GIVEN I ?
WHEN I ?
THEN I ?