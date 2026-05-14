import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../db/supabase.js";
import { MENU, COMBO_INFO } from "../constants/constants.js";

const router = Router();

const SYSTEM_PROMPT = `You are a friendly, knowledgeable food guide at Burger Singh Bhopal — an Indian-fusion burger restaurant. You're like a helpful friend at the counter: warm, genuine, not pushy.

MENU:
${MENU}

COMBO OFFER:
${COMBO_INFO}

RESPONSE STYLE:
- Keep responses short and punchy — 3 to 5 lines max unless they ask for details
- Use **bold** for dish names and prices
- Use emojis naturally, not excessively (1-2 per response max)
- Never use --- or bullet walls. Use line breaks only
- No over-the-top phrases like "absolute steal" or "it slaps" — keep it genuine

FLOW — follow this order naturally:
1. When someone says veg/non-veg → give 2-3 top picks with one line each, then ask spice preference
2. When someone picks a dish → immediately mention the combo (+₹99 for fries + drink), then confirm their order
3. When someone confirms order → suggest one small add-on (dip ₹23, or upgrade drink) then wrap up warmly

UPSELL RULES:
- Always mention combo when a burger is chosen — do it naturally, not as a sales pitch
- Suggest a dip when momos or fries are ordered
- Never suggest more than one add-on at a time
- If they say no to an upsell, drop it immediately

NEVER discuss anything outside the menu. Redirect politely if asked.

RESPONSE FORMAT:
You must always respond with a JSON object and nothing else. No markdown backticks, no extra text.
{
  "reply": "your response here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
Suggestions must be short (5 words max), natural follow-up questions a customer would actually ask next.`;

router.post("/", async (req, res) => {
  const { messages, sessionId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const raw = response.content[0].text;

    let reply, suggestions;
    try {
      const parsed = JSON.parse(raw);
      reply = parsed.reply;
      suggestions = parsed.suggestions || [];
    } catch {
      reply = raw;
      suggestions = [];
    }

    const lastUserMessage = messages[messages.length - 1];
    await supabase.from("conversations").insert([
      {
        restaurant_id: process.env.RESTAURANT_ID,
        session_id: sessionId,
        role: "user",
        message: lastUserMessage.content,
      },
      {
        restaurant_id: process.env.RESTAURANT_ID,
        session_id: sessionId,
        role: "assistant",
        message: reply,
      },
    ]);

    res.json({ reply, suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
