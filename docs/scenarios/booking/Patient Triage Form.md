# Patient Triage Form

# Title / Flow : Patient Triage Form

## Narrative

AS a Patient
I WANT to fill up the triage form (Chikka?) 
SO THAT I can provide context for my upcoming consultation session

## Background:

GIVEN the system is online
And I have an upcoming consultation session

## Scenarios

### Scenario [HAPPY] : Patient successfully submit the triage form

GIVEN I am filling the triage form
WHEN I completed the required form fields
**THEN** my intake should be sent to my upcoming session’s Doctor
AND Doctor accepted my intake

### Scenario outline [HAPPY] : Triage form drafts are saved

GIVEN I filled up the STEP on the triage form
WHEN I get disconnected from the page
**THEN** I my STEP progress should be saved

Example:

| STEP |
| --- |
| Purpose |
| Details |
| Review |

### Scenario [NEGATIVE] : ?

GIVEN ?
WHEN ?
THEN ?

### Scenario [EDGE] : ?

GIVEN ?
WHEN?
THEN?