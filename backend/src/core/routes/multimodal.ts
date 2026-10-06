import fs from 'fs';
import { parseMultipart, extractText } from '../../lib/parser/upload';
import llm from '../../utils/llm/llm';

function toText(out: any): string {
  if (!out) return '';
  if (typeof out === 'string') return out;
  if (typeof out?.content === 'string') return out.content;
  if (Array.isArray(out?.content)) return out.content.map((part: any) => typeof part === 'string' ? part : (part?.text || '')).join('');
  return String(out ?? '');
}

export function multimodalRoutes(app: any) {
  app.post('/api/multimodal-chat', async (req: any, res: any) => {
    try {
      const parsed = await parseMultipart(req);
      const q = parsed.q;
      const files = parsed.files || [];
      if (!q) return res.status(400).json({ error: 'q required' });

      const content: any[] = [{ type: 'text', text: q }];
      for (const file of files) {
        if (file.mimeType.startsWith('image/')) {
          const base64 = fs.readFileSync(file.path).toString('base64');
          content.push({ type: 'image_url', image_url: { url: 'data:' + file.mimeType + ';base64,' + base64 } });
        } else {
          const text = await extractText(file.path, file.mimeType);
          if (text && text.trim()) {
            content.push({ type: 'text', text: '\n\n[Attached file: ' + file.filename + ']\n' + text });
          }
        }
      }

      const system = {
        role: 'system',
        content: 'You are the PageLM Cambridge IGCSE Physics tutor. Stay inside Cambridge IGCSE Physics. Use the selected topic and attached teacher/student material context. Inspect images carefully when they contain questions, graphs, diagrams, tables, handwriting or textbook pages. Explain reasoning clearly. If something is outside the selected topic or syllabus, say so instead of pretending it is in the syllabus.',
      };

      const result = await llm.call([system as any, { role: 'user', content } as any] as any);
      return res.status(200).json({ ok: true, answer: toText(result) });
    } catch (error: any) {
      console.error('[multimodal-chat] error', error?.message || error);
      return res.status(500).json({ error: error?.message || 'multimodal chat failed' });
    }
  });
}
