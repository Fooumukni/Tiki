export interface IntakeConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface IntakeEvaluationInput {
  conversationHistory: IntakeConversationMessage[];
}

export interface IntakeEvaluationResult {
  needsMoreInfo: boolean;
  followUpQuestion?: string;
  issueDescription?: string;
}
