// Maximum tokens for model responses
// Increased from 8192 for better code generation
// Supports larger, more comprehensive code artifacts
export const MAX_TOKENS = 16384;

// limits the number of model responses that can be returned in a single request
export const MAX_RESPONSE_SEGMENTS = 3;

// Threshold for context compaction (in estimated tokens)
// When the total estimated tokens exceeds this, older messages are summarized
export const CONTEXT_COMPACTION_THRESHOLD = 6000;

// Number of recent messages to keep in full detail during compaction
export const KEEP_RECENT_MESSAGES = 4;
