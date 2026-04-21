import { user } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { seedDate } from "./helpers";

const names = [
	"Ana Popescu",
	"Andrei Ionescu",
	"Maria Radu",
	"Mihai Stan",
	"Elena Dobre",
	"Vlad Georgescu",
	"Ioana Marin",
	"Rares Dumitru",
	"Teodora Pavel",
	"Alexandru Ilie",
	"Diana Tudor",
	"Victor Nistor",
	"Claudia Matei",
	"Sorin Anghel",
	"Bianca Preda",
	"Lucian Munteanu",
	"Adriana Oprea",
	"Catalin Enache",
	"Raluca Serban",
	"Stefan Neagu",
	"Paula Lupu",
	"George Florea",
	"Alina Voicu",
	"Dragos Barbu",
	"Simona Cristea",
	"Cosmin Badea",
	"Lavinia Roman",
	"Robert Zaharia",
	"Monica Dinu",
	"Paul Toma",
];

export const userSeed: EntitySeed = {
	name: "user",
	run: async (db, context) => {
		context.users = await db
			.insert(user)
			.values(
				names.map((name, index) => ({
					id: `user-${String(index + 1).padStart(3, "0")}`,
					name,
					email: `user${String(index + 1).padStart(3, "0")}@example.com`,
					phone: `+4074000${String(index + 1).padStart(3, "0")}`,
					emailVerified: index % 4 !== 0,
					image: null,
					createdAt: seedDate(index + 1),
					updatedAt: seedDate(index + 1, 10),
				})),
			)
			.returning();
	},
};
