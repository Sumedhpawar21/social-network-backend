import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    attachment: {
      type: [String],
    },
    message: {
      type: String,
    },
    senderId: {
      type: String,
    },
    chatId: String,
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);

export default Message;
