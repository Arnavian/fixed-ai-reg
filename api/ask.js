import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, country, question } = req.body;

  try {
    if (type === "score") {
      if (!country || !country.name || !country.code) {
        return res.status(400).json({
          error: "Country name and code are required."
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI regulation analyst.

Return ONLY valid JSON. No markdown. No extra text.

Evaluate the country's AI regulation environment.

Return this JSON:
{
  "overallScore": number,
  "businessScore": number,
  "consumerScore": number,
  "regulationStyle": string,
  "namedPolicies": string,
  "overview": string,
  "businessImpact": string,
  "consumerImpact": string,
  "politicalImpact": string,
  "keyStrengths": string,
  "mainWeaknesses": string,
  "reasoning": string
}

Rules:
- Name real laws/policies when possible
- businessScore = pro-innovation / low friction (score out of 100)
- consumerScore = privacy / safety / accountability (score out of 100)
- Keep answers specific and short (1–3 sentences each)
- Do NOT invent fake laws`
          },
          {
            role: "user",
            content: `Analyze AI regulation in ${country.name} (${country.code}).`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1000
      });

      const data = JSON.parse(response.choices[0].message.content);
      return res.status(200).json(data);
    }

    if (type === "question") {
      if (!country || !question) {
        return res.status(400).json({
          error: "Country and question are required."
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI regulation expert.

Answer questions about AI laws, governance, business impact, and political effects.

Rules:
- Be specific
- Mention real policies/laws when possible
- No fluff
- 2–4 sentences max`
          },
          {
            role: "user",
            content: `Country: ${country}\nQuestion: ${question}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const answer = response.choices[0].message.content.trim();
      return res.status(200).json({ answer });
    }

    return res.status(400).json({ error: "Invalid type" });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message });
  }
}