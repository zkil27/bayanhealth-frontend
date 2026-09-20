/**
 * Thin wrapper around the Cognito Identity Provider HTTP JSON API.
 * No SDK dependency — Cognito's public-client endpoints work with plain fetch.
 */

const REGION = process.env.NEXT_PUBLIC_AWS_REGION!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

export class CognitoError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CognitoError";
  }
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** A single Cognito user attribute as sent to the SignUp API. */
export interface CognitoUserAttribute {
  Name: string;
  Value: string;
}

/** Input to the pure registration-attribute builder. */
export interface RegistrationInput {
  email: string;
  role: "patient" | "doctor";
  /** Arbitrary profile fields collected during sign-up; never sent as user attributes. */
  profile?: Record<string, unknown>;
}

/**
 * Pure builder for the Cognito `SignUp` `UserAttributes` array.
 *
 * Only attributes defined in the Cognito user-pool schema may be sent. The pool
 * defines no `custom:role` attribute, so the selected role is intentionally
 * excluded here and conveyed to the Post-Confirmation trigger via `ClientMetadata`
 * instead. The role and profile are accepted so the attribute set is testable
 * across all inputs, but they never widen the emitted attribute-name set.
 */
export function buildRegistrationAttributes(
  input: RegistrationInput,
): CognitoUserAttribute[] {
  return [{ Name: "email", Value: input.email }];
}

async function post(target: string, body: Record<string, unknown>) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new CognitoError(
      data.__type ?? "UnknownError",
      data.message ?? "An unexpected error occurred.",
    );
  }
  return data;
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const data = await post("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  const result = data.AuthenticationResult;
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn,
  };
}

export async function signUp(
  email: string,
  password: string,
  role: "patient" | "doctor",
): Promise<void> {
  await post("SignUp", {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: buildRegistrationAttributes({ email, role }),
    // Role is not a schema attribute; convey it to the Post-Confirmation trigger.
    ClientMetadata: { role },
  });
}

export async function confirmSignUp(
  email: string,
  code: string,
  role: "patient" | "doctor",
): Promise<void> {
  await post("ConfirmSignUp", {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    // Forwarded to the Post-Confirmation trigger as event.request.clientMetadata.
    ClientMetadata: { role },
  });
}

export async function resendCode(email: string): Promise<void> {
  await post("ResendConfirmationCode", {
    ClientId: CLIENT_ID,
    Username: email,
  });
}

export async function refreshSession(
  currentRefreshToken: string,
): Promise<Omit<AuthTokens, "refreshToken"> & { refreshToken: string }> {
  const data = await post("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { REFRESH_TOKEN: currentRefreshToken },
  });
  const result = data.AuthenticationResult;
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: currentRefreshToken,
    expiresIn: result.ExpiresIn,
  };
}

/** Extract claims from a JWT payload (base64url-encoded second segment). */
export function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

/** Returns the Cognito groups from an IdToken claim, e.g. ["patient"]. */
export function getGroupsFromToken(idToken: string): string[] {
  const claims = parseJwtPayload(idToken);
  const groups = claims["cognito:groups"];
  return Array.isArray(groups) ? (groups as string[]) : [];
}
