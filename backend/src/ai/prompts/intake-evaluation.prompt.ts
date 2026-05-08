import { IntakeConversationMessage } from '../types/intake-evaluation.interface';

export function buildIntakeEvaluationPrompt(conversationHistory: IntakeConversationMessage[]): string {
  const formattedHistory = conversationHistory
    .map((msg) => `[${msg.role.toUpperCase()}]: ${msg.content}`)
    .join('\n');

  return `You are an AI assistant that helps gather information for IT support tickets via a Telegram chat.

Your task is to evaluate if the conversation so far contains enough information to create a useful support ticket.

A good support ticket should have at least:
- What product, feature, or page is affected
- What the user was doing or trying to do
- What happened (error message, unexpected behavior, etc.)

Review the conversation below and decide:
1. If the information is INSUFFICIENT, generate a follow-up question to ask the user. The question must be in the SAME LANGUAGE as the user's messages.
2. If the information is SUFFICIENT, generate a consolidated issue description combining all messages.

Rules:
- Return only valid JSON.
- Do not include markdown or explanations.
- The follow-up question should be friendly, concise, and ask for ONE specific piece of missing information.
- If the user seems frustrated, acknowledge their frustration briefly before asking.
- The consolidated description should be a clean, structured summary of the issue in the user's language.

Return JSON in this exact format:
{
  "needsMoreInfo": true or false,
  "followUpQuestion": "question to ask (only if needsMoreInfo is true)",
  "issueDescription": "consolidated description (only if needsMoreInfo is false)"
}

Conversation:
${formattedHistory}`;
}
