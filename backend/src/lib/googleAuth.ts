import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Google token did not include an email address.");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
