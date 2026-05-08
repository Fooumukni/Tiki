export function buildIssueAnalysisPrompt(message: string): string {
  return `You are an AI assistant specialized in IT support ticket triage.

Your task is to analyze the user's message and return a valid JSON object only.

Analyze the issue and extract:
- generatedTitle
- summary
- category
- priority
- sentiment
- suggestedTeam
- suggestedResponse
- tags

Rules:
- Return only valid JSON.
- Do not include markdown.
- Do not include explanations.
- Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL.
- Sentiment must be one of: NEUTRAL, FRUSTRATED, ANGRY, CONFUSED, URGENT.
- Suggested team should be one of: Backend, Frontend, DevOps, QA, Support, Data, AI, Security, General.
- If the message mentions production outage, data loss, security breach, payment failure, login blocked for many users, or system unavailable, use HIGH or CRITICAL.
- Keep the suggested response professional and concise.

User message:
${message}`;
}
