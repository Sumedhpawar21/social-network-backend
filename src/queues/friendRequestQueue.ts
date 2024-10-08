import { Queue, Worker } from "bullmq";
import { defaultRedisConfig } from "../config/redisConfig";
import {
  sendFriendRequestAcceptedNotification,
  sendFriendRequestNotification,
} from "../utils/notification-utils";

export const FriendRequestQueueName = "FriendRequestQueue";

export const NotificationQueue = new Queue(FriendRequestQueueName, {
  connection: defaultRedisConfig,
});

export const friendRequestWorker = new Worker(
  FriendRequestQueueName,
  async (job) => {
    console.log("Job Data", job.data);

    const { userId, friendId, friendshipId, notificationType } = job.data;

    if (notificationType === "FriendRequestAccepted") {
      await sendFriendRequestAcceptedNotification({
        userId,
        friendId,
        friendshipId,
      });
      console.log("FriendShipId From Queue:", friendshipId);
    } else {
      await sendFriendRequestNotification({ userId, friendId, friendshipId });
    }
  },
  {
    connection: defaultRedisConfig,
  }
);

friendRequestWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
