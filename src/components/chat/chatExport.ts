export function exportChatAsMarkdown(messages: { role: string; content: string; timestamp: string }[]): string {
  const lines: string[] = ['# Joyful Chat Export', ''];

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString();
    const role = msg.role === 'user' ? '**You**' : msg.role === 'assistant' ? '**Joyful AI**' : '**System**';
    lines.push(`### ${role} - ${time}`, '', msg.content, '', '---', '');
  }

  return lines.join('\n');
}
