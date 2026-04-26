import { accountSeed } from "./account.seed";
import { conversationsSeed } from "./conversations.seed";
import { helpOffersSeed } from "./helpOffers.seed";
import { helpRequestsSeed } from "./helpRequests.seed";
import { interactionHistoriesSeed } from "./interactionHistories.seed";
import { messagesSeed } from "./messages.seed";
import { notificationsSeed } from "./notifications.seed";
import { profilesSeed } from "./profiles.seed";
import { ratingsSeed } from "./ratings.seed";
import { requestDetailsSeed } from "./requestDetails.seed";
import { requestLocationsSeed } from "./requestLocations.seed";
import { sessionSeed } from "./session.seed";
import { taskAssignmentsSeed } from "./taskAssignments.seed";
import { userAccessesSeed } from "./userAccesses.seed";
import { userSeed } from "./user.seed";
import { userVerificationsSeed } from "./userVerifications.seed";
import { verificationSeed } from "./verification.seed";
import { volunteerKnownLocationsSeed } from "./volunteerKnownLocations.seed";
import { volunteerProfilesSeed } from "./volunteerProfiles.seed";
import { volunteersSeed } from "./volunteers.seed";
import type { EntitySeed } from "./types";

export { createSeedContext } from "./types";

export const entitySeeds: EntitySeed[] = [
	userSeed,
	accountSeed,
	sessionSeed,
	verificationSeed,
	profilesSeed,
	userAccessesSeed,
	volunteersSeed,
	volunteerProfilesSeed,
	volunteerKnownLocationsSeed,
	userVerificationsSeed,
	helpRequestsSeed,
	requestLocationsSeed,
	requestDetailsSeed,
	helpOffersSeed,
	taskAssignmentsSeed,
	conversationsSeed,
	messagesSeed,
	ratingsSeed,
	interactionHistoriesSeed,
	notificationsSeed,
];
