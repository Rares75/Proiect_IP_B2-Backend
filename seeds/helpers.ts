export const seedDate = (day: number, hour = 9) =>
	new Date(Date.UTC(2026, 0, day, hour, 0, 0));

export const futureSeedDate = (day: number, hour = 9) =>
	new Date(Date.UTC(2027, 0, day, hour, 0, 0));

export const pick = <T>(items: readonly T[], index: number): T => {
	const item = items[index % items.length];
	if (item === undefined) {
		throw new Error("Cannot pick from an empty seed array.");
	}

	return item;
};

export const point = (index: number) => ({
	x: 26.08 + index * 0.01,
	y: 44.42 + index * 0.01,
});
