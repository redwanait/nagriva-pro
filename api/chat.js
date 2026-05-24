export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history } = req.body;

    let contextText = "";
    if (history && history.length > 0) {
      contextText = history
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") + "\n";
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are Nagriva AI assistant.

You help users with:
- Web Design
- SEO
- Branding
- Video Editing
- Social Media
- AI Automation

Be professional, short, and friendly.
Always encourage users to book a free call.

Previous conversation:
${contextText}
User message:
${message}
`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't respond.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "AI server error",
    });
  }
}