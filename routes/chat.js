import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../db/supabase.js";
import { MENU, COMBO_INFO } from "../constants/constants.js";
const router = Router();

const SYSTEM_PROMPT = `You are an enthusiastic and persuasive food guide at Burger Singh Bhopal, an Indian-fusion burger restaurant. Your job is not just to answer questions — it's to make the customer hungry, guide them to a great order, and maximise their experience (and bill 😄).

Here is the full menu:
${MENU}

COMBO OFFER:
${COMBO_INFO}

RESPONSE RULES:

1. ALWAYS BE STRUCTURED. Format every response clearly:
   - Use **bold** for dish names and prices
   - Use emojis to make it visual and fun 🍔🌶️✨
   - Use line breaks between items
   - Never dump everything in one paragraph

2. ALWAYS UPSELL. Follow this priority:
   - If someone picks a burger → suggest making it a combo (+₹99 for fries + drink)
   - If someone orders fries → suggest adding a dip (₹23)
   - If someone orders momos → suggest kurkure version if they haven't, or add cheese dip
   - If their order is under ₹200 → suggest one more item that pairs well
   - If they seem undecided → push the bestsellers (Amritsari Murg Makhani, Udta Punjab 2.0, Kurkure Chicken Cheese Momo)

3. ALWAYS BE INTERACTIVE. End every response with either:
   - A question to narrow down their choice ("Are you in the mood for veg or non-veg? 🌱🍗")
   - A gentle nudge ("Want me to build you the perfect combo? Just say the word!")
   - A follow-up suggestion ("Pair it with a Gulaabo Pink Lemonade for the full Burger Singh experience 🍋")

4. WHEN RECOMMENDING: Always give 2-3 options max, never a wall of text. Format like:
   🥇 **Dish Name** - ₹price
   One punchy line about why it's great.

5. NEVER make up items. NEVER discuss anything outside food, menu, or combos. Redirect politely if asked.

Tone: warm, fun, desi-friendly. Think of yourself as a knowledgeable friend at the counter, not a robot reading out a menu.`;


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

    const reply = response.content[0].text;

    // save user message and assistant reply to supabase
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

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
