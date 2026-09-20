# Doctor Onboarding

# Title / Flow : Doctor Onboarding

## Narrative

AS a user applying for Doctor role
I WANT to be approved
SO THAT I am onboard with the application

## Background:

GIVEN the system is online
And I have sent my Doctor’s Application
And my Doctor’s application has been approved

## Scenarios

### Scenario [HAPPY] : Doctor onboards in the Application

GIVEN I received my approval for onboarding in the Application from email
WHEN I get my account’s credentials
**THEN** I should be able to sign in as a Doctor in the Application
AND I should reach the Doctor’s dashboard

### Scenario [HAPPY] : Doctor setups their schedule and availability

GIVEN it’s my first time signing in
WHEN I didn’t setup my schedule and availability during the doctor’s application
**THEN** I should be able to setup my schedule and availability
AND I should wait for admin’s approval

### Scenario [HAPPY] : Doctor setups their schedule and availability

GIVEN I have an account as Doctor
AND I have setup my schedule and availability
WHEN I look for Doctor’s marketplace
**THEN** I should be able to see myself as available to book for consultation

### Scenario [NEGATIVE] : ?

GIVEN ?
WHEN?
THEN ?
AND ?

### Scenario [EDGE] : third-party communication application error?

GIVEN ?
WHEN ?
THEN ?