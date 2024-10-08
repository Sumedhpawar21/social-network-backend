import Redis, { Redis as RedisClient, RedisOptions } from "ioredis";

export let redis: RedisClient | null = null;

export let defaultRedisConfig: RedisOptions = {
  host: process.env.REDIS_HOST as string,
  port: parseInt(process.env.REDIS_PORT as string, 10),
  password: process.env.REDIS_PASSWORD as string,
};

export const connectRedis = (): RedisClient => {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST as string,
      port: parseInt(process.env.REDIS_PORT as string, 10),
      password: process.env.REDIS_PASSWORD as string,
    });

    redis.on("connect", () => {
      console.log("Connected to Redis");
    });

    redis.on("error", (error: Error) => {
      console.error("Error connecting to Redis", error);
    });
  }

  return redis;
};
