import OpenAI from "openai";

// Create a single instance of the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;
