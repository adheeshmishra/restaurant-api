import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../db/supabase.js";

const router = Router();

const MENU = `
BURGERS (Non-Veg):
- Singh is Kinng: ₹149 — double chicken patty, mint chutney, pickled onions, house sauce. Spice: 2/3
- Maharaja Burger: ₹169 — crispy chicken, cheddar, fried onions, royal mayo. Spice: 1/3
- Punjabi Tadka: ₹139 — spiced chicken, tadka mayo, shredded cabbage, tangy pickle. Spice: 3/3
- Desi Ghee Burger: ₹159 — ghee-roasted patty, butter-basted bun, dhania chutney. Spice: 2/3

BURGERS (Veg):
- Aloo Tikki Burger: ₹99 — spiced potato patty, green chutney, pickled jalapeños. Spice: 2/3
- Paneer Tikka Burger: ₹119 — grilled paneer, tandoori marinade, crispy sev, mint aioli. Spice: 2/3
- Mushroom Melt: ₹129 — stuffed mushroom, makhani sauce, rocket leaves, gouda. Spice: 1/3

SIDES:
- Masala Fries: ₹79 — chaat masala, fresh coriander
- Loaded Fries: ₹119 — cheese sauce, jalapeños, crispy fried onions
- Onion Rings: ₹89 — beer-battered, chipotle dip

DRINKS:
- Masala Chai Shake: ₹119
- Mango Lassi Shake: ₹109
- Cold Coffee: ₹89
- Fresh Lime Soda: ₹59
`;

const SYSTEM_PROMPT = `You are the friendly AI food guide at Burger Singh Bhopal, an Indian-fusion burger restaurant.

Here is the full menu:
${MENU}

Help customers find dishes that match their preferences, explain ingredients and spice levels, suggest combos, and recommend for first-timers, vegetarians, and spice lovers. Be warm and concise — 2-3 sentences unless they ask for more. Never make up items not on the menu.

If the customer asks anything unrelated to the menu, food, or restaurant, politely redirect them. Say something like "I'm only here to help you navigate our menu! Ask me about any dish, combo, or recommendation 😊"`;

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
