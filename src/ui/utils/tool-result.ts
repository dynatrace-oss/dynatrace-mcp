/**
 * Type guard for text content in MCP tool results.
 * @example
 * const textContent = result.content?.find(isTextContent);
 * if (textContent) {
 *   console.log(textContent.text);
 * }
 */
export function isTextContent(content: unknown): content is { type: 'text'; text: string } {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as { type: string }).type === 'text' &&
    'text' in content
  );
}
