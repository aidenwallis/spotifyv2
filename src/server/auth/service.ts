import jwt from "@tsndr/cloudflare-worker-jwt";
import { UserModel } from "../db";
import { Env } from "../types";

const AUDIENCE = "https://spotify.aidenwallis.co.uk";
const ISSUER = AUDIENCE;

export class AuthService {
  constructor(private env: Env) {}

  public signToken(user: UserModel) {
    return jwt.sign(
      {
        aud: AUDIENCE,
        iss: ISSUER,
        sub: user.id,
        exp: Math.floor((Date.now() + 3600_000) / 1000),
      },
      this.env.CURRENT_JWT_SECRET
    );
  }

  public async verifyToken(token: string) {
    try {
      const isValid = await jwt.verify(token, this.env.CURRENT_JWT_SECRET);
      if (!isValid) {
        return null;
      }

      const v = await jwt.decode(token);
      return (v?.payload?.sub || null) as string;
    } catch (error) {
      return null;
    }
  }
}
