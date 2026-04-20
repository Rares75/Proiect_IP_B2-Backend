import { betterAuth } from "better-auth";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/schema";
import { openAPI } from "better-auth/plugins";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg",  
		schema: schema, }),

	plugins : [openAPI()],
	emailAndPassword: {
		enabled: true,
	},

	//   socialProviders: {
	//   google: {
	//     clientId: process.env.GOOGLE_CLIENT_ID!,
	//     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
	//   },
	//  },

	//   advanced: {
	//     crossSubDomainCookies: {
	//       enabled: true,
	//       domain: ".example.com",
	//     },

	//     cookiePrefix: "my-app",
	//     useSecureCookies: true,
	//     cookies: {
	//       session_token: {
	//         name: "session_token",
	//         attributes: {
	//           httpOnly: true,
	//           secure: process.env.NODE_ENV === "production",
	//           sameSite: "lax",
	//           maxAge: 60 * 60 * 24 * 7,
	//           path: "/",
	//         },
	//       },
	//     },
	//   },

	rateLimit: {
		enabled: true,
		window: 60 * 1000,
		max: 10,
	},

	trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3001",
    "http://localhost:3000",
    "null",
],
	
});

export default auth;
