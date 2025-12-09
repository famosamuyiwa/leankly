## Appwrite Function: Classify Leank

Use this Appwrite function ID as `EXPO_PUBLIC_APPWRITE_CLASSIFY_FUNCTION_ID` so the client can auto-tag leanks before saving.

### Expected Input
```json
{
  "title": "string",
  "description": "string",
  "categories": [
    "Fitness & Sports",
    "Study & Learning",
    "Social & Nightlife",
    "Volunteering & Causes",
    "Health & Wellness",
    "Creative & Arts",
    "Food & Drinks",
    "Travel & Outdoors",
    "Career & Networking",
    "Gaming & Esports",
    "Other"
  ]
}
```

### Expected Output
```json
{ "category": "Food & Drinks" }
```

If you can’t determine a match, return `"Other"`.

### Example Function Code (Node 18 / Appwrite Functions)
Save as your function’s entrypoint (e.g., `index.js`). Requires env var `OPENAI_API_KEY`.

```js
import { Client, InputFile, Functions } from "node-appwrite"; // Appwrite SDK is available in the runtime

export default async ({ req, res, log }) => {
  try {
    const body = JSON.parse(req.body || "{}");
    const { title = "", description = "", categories = [] } = body;
    const fallback = "Other";

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.json({ category: fallback });
    }

    const prompt = `
You are a concise classifier. Given a leank title and description, pick exactly one category from this list:
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return only the category text from the list. If none fit, respond with "Other".

Title: ${title}
Description: ${description}
`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!openaiRes.ok) {
      log(`OpenAI error: ${openaiRes.status} ${await openaiRes.text()}`);
      return res.json({ category: fallback });
    }

    const data = await openaiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const normalized = raw.trim();
    const match =
      categories.find(
        (c) => c.toLowerCase().replace(/\s+/g, " ") === normalized.toLowerCase().replace(/\s+/g, " ")
      ) ||
      categories.find((c) =>
        c.toLowerCase().replace(/\s+/g, " ").includes(normalized.toLowerCase().replace(/\s+/g, " "))
      );

    return res.json({ category: match || fallback });
  } catch (err) {
    log(`Classification failed: ${err?.message || err}`);
    return res.json({ category: "Other" });
  }
};
```

### Notes
- Set runtime to **Node 18** (or newer) and add `OPENAI_API_KEY` as an environment variable.
- The client already trims the title/description and sends the category list; just return `{ category: "<one of the list>" }`.
- If you deploy under a different function ID, update `EXPO_PUBLIC_APPWRITE_CLASSIFY_FUNCTION_ID` (or `_CLASSIFY_LEANK_FUNCTION_ID`) accordingly.
