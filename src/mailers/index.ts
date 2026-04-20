import { DevMailer } from "./dev.mailer";
import { ProdMailer } from "./prod.mailer";

export function getMailer() {
  if (process.env.NODE_ENV === "production") {
    return new ProdMailer();
  }
  return new DevMailer();
}