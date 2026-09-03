import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "#/db/schema/auth-schema";
import { db } from "#/db/index.ts";
import { env } from "#/env.ts";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	advanced:{
		database:{
			generateId:"uuid"
		}
	},
	database: drizzleAdapter(db, { provider: "pg", schema }),
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
	},
	plugins: [tanstackStartCookies()],
});

export type Session = typeof auth.$Infer.Session;
