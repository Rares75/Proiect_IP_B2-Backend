import { container } from "../di";
import { DevMailer } from "./dev.mailer";
import { ProdMailer } from "./prod.mailer";

export function getMailer() {
	if (Bun.env.NODE_ENV === "production") {
		return container.get<ProdMailer>(ProdMailer);
	}
	return container.get<DevMailer>(DevMailer);
}
