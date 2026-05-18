export class VolunteerException extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VolunteerException";
	}
}
