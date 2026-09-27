import llm from "../../utils/llm/models/llm"

export type PracticeSource = {
  id: number
  title: string
  paper_code?: string | null
  year?: string | null
  file_url?: string | null
}

export type FoundQuestion = {
  academicSourceId: number
  paperTitle: string
  questionRef: string
  questionText: string
  imageUrl?: string | null
}

export type GradedResult = {
  marksAwarded: number
  marksAvailable: number
  feedback: string
}

function stripFences(s: string) {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "").trim()
}
function extractObject(s: string) {
  const m = s.match(/\{[\s\S]*\}/)
  return m ? m[0] : s
}
function tryParse<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}
function nstr(x: any, fallback = "") {
  const t = String(x ?? "").replace(/\s+/g, " ").trim()
  return t || fallback
}

const FIND_SYS = `PRIMARY OBJECTIVE
You are selecting ONE real exam question on the requested topic, drawn ONLY
from the list of approved past papers provided to you. You must never invent
a question, a paper, or a paper code that is not in the provided list.

If none of the provided papers plausibly contain a question on this topic,
say so honestly in the questionText field rather than fabricating one.

OUTPUT CONTRACT
Return only a JSON object, no markdown, no prose outside the JSON.

SCHEMA
"academicSourceId": the numeric id of the chosen source, copied exactly from
  the provided list (never invented)
"paperTitle": the title of the chosen source, copied exactly from the list
"questionRef": a short reference like "Q4" or "Section B, Q2" (your best
  identification of where in that paper the question is)
"questionText": the question text, in plain English
"imageUrl": null (diagrams are not yet extracted automatically)

VALIDATION
All 5 keys present. academicSourceId must match one of the provided ids.`

const GRADE_SYS = `PRIMARY OBJECTIVE
Grade a student's answer to an exam question against real mark-scheme
principles for this subject and question type. Do not invent marks the
question could not plausibly carry; keep the awarded marks proportionate
and realistic for an IGCSE-level question of this kind.

OUTPUT CONTRACT
Return only a JSON object, no markdown, no prose outside the JSON.

SCHEMA
"marksAwarded": number, marks given to the student's answer
"marksAvailable": number, total marks the question is worth (your best
  estimate from the question's command words and structure)
"feedback": string, 1-3 sentences explaining what was awarded and, if marks
  were lost, what specific point(s) were missing`

async function ask(sys: string, userContent: string) {
  const msgs = [
    { role: "system", content: sys },
    { role: "user", content: userContent },
  ] as const
  const r = await llm.invoke([...msgs] as any)
  const raw = typeof r === "string" ? r : String((r as any)?.content ?? "")
  return tryParse<any>(extractObject(stripFences(raw)))
}

export async function handleFindQuestion(
  board: string,
  subject: string,
  topic: string,
  availableSources: PracticeSource[]
): Promise<FoundQuestion> {
  if (!availableSources.length) {
    throw new Error("no approved sources provided")
  }

  const sourcesList = availableSources
    .map((s) => `id=${s.id} | title="${s.title}" | paper_code=${s.paper_code || "n/a"} | year=${s.year || "n/a"}`)
    .join("\n")

  const userContent = `Board: ${board}\nSubject: ${subject}\nTopic: ${topic || "(any topic)"}\n\nApproved sources you may choose from (never use an id not listed here):\n${sourcesList}`

  const parsed = await ask(FIND_SYS, userContent)
  if (!parsed || typeof parsed.academicSourceId !== "number") {
    throw new Error("model did not return a valid question selection")
  }

  const matched = availableSources.find((s) => s.id === parsed.academicSourceId)
  if (!matched) {
    throw new Error("model selected a source id outside the approved list")
  }

  return {
    academicSourceId: matched.id,
    paperTitle: nstr(parsed.paperTitle, matched.title),
    questionRef: nstr(parsed.questionRef, "Q?"),
    questionText: nstr(parsed.questionText, "(no question text returned)"),
    imageUrl: parsed.imageUrl || null,
  }
}

export async function handleGrade(
  questionText: string,
  studentAnswer: string
): Promise<GradedResult> {
  const userContent = `Question:\n${questionText}\n\nStudent's answer:\n${studentAnswer}`
  const parsed = await ask(GRADE_SYS, userContent)

  if (
    !parsed ||
    typeof parsed.marksAwarded !== "number" ||
    typeof parsed.marksAvailable !== "number"
  ) {
    throw new Error("model did not return a valid grading result")
  }

  return {
    marksAwarded: Math.max(0, parsed.marksAwarded),
    marksAvailable: Math.max(1, parsed.marksAvailable),
    feedback: nstr(parsed.feedback, "No feedback returned."),
  }
}
