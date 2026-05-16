import { getMailer } from "../../mailers/getMailer";
import { logger } from "../logger";
import {
	getTemplateByType,
	type SendVerificationRequestType,
} from "./getEmailTemplateByType";

export interface SendVerificationConfigType {
	email: string;
	otp: string;
	type: SendVerificationRequestType;
}

export async function sendVerificationOTP({
	email,
	otp,
	type,
}: SendVerificationConfigType) {
	try {
		const mailer = getMailer();
		const { template, subject } = getTemplateByType(type);
		await mailer.send({
			to: email,
			subject,
			html: template(otp, 10),
		});
	} catch (error) {
		logger.exception(error);
	}
}
