import { parseMultipart, extractText } from '../../lib/parser/upload';
import fs from 'fs';
import llm from '../../utils/llm/llm';

function toText(out: any): string {
  if (!out) return '';
  if (typeof out === 'string') return out;
  if (typeof out?.content === 'string') return out.content;
  if (Array.isArray(out?.content)) return out.content.map((part: any) => typeof part === 'string' ? part : (part?.text || '')).join('');
  return String(out ?? '');
}

function firstJsonObject(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

async function attachmentParts(file: any) {
  if (file.mimeType.startsWith('image/')) {
    const base64 = fs.readFileSync(file.path).toString('base64');
    return [{ type: 'image_url', image_url: { url: 'data:' + file.mimeType + ';base64,' + base64 } }];
  }
  const text = await extractText(file.path, file.mimeType);
  return [{ type: 'text', text: text || '' }];
}

export function classifiedRoutes(app: any) {
  app.post('/api/classified-checker', async (req: any, res: any) => {
    try {
      const parsed = await parseMultipart(req);
      const files = parsed.files || [];
      const answersFile = files.find((file: any) => /answers/i.test(file.filename));
      const markSchemeFile = files.find((file: any) => /mark.?scheme/i.test(file.filename));

      if (!answersFile || !markSchemeFile) {
        return res.status(400).json({ error: 'Please name the two uploads so one contains answers and the other contains mark-scheme.' });
      }

      const answers = await attachmentParts(answersFile);
      const markScheme = await attachmentParts(markSchemeFile);
      const topic = parsed.q || 'Cambridge IGCSE Physics';

      const content: any[] = [{
        type: 'text',
        text: 'Topic: ' + topic + '\n\nCheck the student answers against the supplied classified mark scheme. The supplied mark scheme is authoritative. Never invent missing marking points. Return JSON only with score, feedback, and questionFeedback (array of question, marks, feedback).',
      }];
      content.push({ type: 'text', text: '\n\n=== STUDENT ANSWERS ===' }, ...answers);
      content.push({ type: 'text', text: '\n\n=== CLASSIFIED MARK SCHEME ===' }, ...markScheme);

      const result = await llm.call([
        { role: 'system', content: 'You are a Cambridge IGCSE Physics marking assistant. Grade only against the supplied mark scheme.' } as any,
        { role: 'user', content } as any,
      ] as any);

      const raw = toText(result);
      const parsedJson = firstJsonObject(raw);
      if (parsedJson) return res.status(200).json(parsedJson);
      return res.status(200).json({ score: 'Reviewed', feedback: raw, questionFeedback: [] });
    } catch (error: any) {
      console.error('[classified-checker] error', error?.message || error);
      return res.status(500).json({ error: error?.message || 'classified checker failed' });
    }
  });
}
