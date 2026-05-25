import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl);

redis.on("connect", () => {
	console.log("✅ Conectat cu succes la instanța Redis!");
});

redis.on("error", (err) => {
	console.error("❌ Eroare la conectarea cu Redis:", err);
});
