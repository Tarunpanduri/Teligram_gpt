require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Load API Keys from .env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TOGETHER_AI_API_KEY = process.env.TOGETHER_AI_API_KEY;

// Initialize the bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Store user conversation historyy
const userSessions = {};

// Function to split large messages into chunks
function splitMessage(message, maxChunkSize = 4000) {
  const chunks = [];
  for (let i = 0; i < message.length; i += maxChunkSize) {
    chunks.push(message.substring(i, i + maxChunkSize));
  }
  return chunks;
}

// Function to get AI response from DeepSeek-V3
async function getAIResponse(chatId, userMessage) {
  // Initialize session if user is new
  if (!userSessions[chatId]) {
    userSessions[chatId] = [];
  }

  // Split large messages into chunks before processing
  const messageChunks = splitMessage(userMessage);

  // Process each chunk separately
  for (const chunk of messageChunks) {
    userSessions[chatId].push({ role: "user", content: chunk });

    // Keep only the last 15 messages for context
    if (userSessions[chatId].length > 15) {
      userSessions[chatId].shift();
    }
  }

  try {
    const response = await axios.post(
      "https://api.together.ai/v1/chat/completions",
      {
        model: "deepseek-ai/DeepSeek-V3",
        messages: userSessions[chatId],
      },
      { headers: { Authorization: `Bearer ${TOGETHER_AI_API_KEY}` } }
    );

    const aiResponse = response.data.choices[0].message.content.trim();
    
    // Add AI response to conversation history
    userSessions[chatId].push({ role: "assistant", content: aiResponse });

    return aiResponse;
  } catch (error) {
    console.error(error);
    return "Oops! Something went wrong. 😕 Try again!";
  }
}

// Handle Text Messages with Large Code Support
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;


  bot.sendMessage(chatId, "🤖 Processing your message...");
  const response = await getAIResponse(chatId, text);
  bot.sendMessage(chatId, response);
});

console.log("🤖 Telegram bot with DeepSeek-V3 (Large Message Support) is running...");
