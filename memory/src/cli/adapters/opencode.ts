import type { PlatformAdapter } from '../types.js';

// Maps OpenCode stdin format to normalized hook input
// OpenCode uses: session_id (not sessionId), working_directory, tool_name, tool_input, tool_result
// Handle undefined input gracefully for hooks that don't receive stdin
export const opencodeAdapter: PlatformAdapter = {
  normalizeInput(raw) {
    const r = (raw ?? {}) as any;
    return {
      sessionId: r.session_id || r.sessionId,  // OpenCode uses snake_case
      cwd: r.working_directory || r.cwd || process.cwd(),
      prompt: r.prompt || r.user_message,
      toolName: r.tool_name || r.toolName,
      toolInput: r.tool_input || r.toolInput,
      toolResponse: r.tool_result || r.tool_response || r.toolResponse,
      transcriptPath: r.transcript_path || r.transcriptPath,
      // Additional OpenCode-specific fields
      filePath: r.file_path || r.filePath,
      edits: r.edits,
    };
  },
  formatOutput(result) {
    // OpenCode expects similar response format to Claude Code
    return {
      continue: result.continue ?? true,
      context: result.context,
    };
  }
};
