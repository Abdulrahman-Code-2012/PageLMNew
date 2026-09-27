import { handleFindQuestion, handleGrade } from "../../services/practice"

const plog = (...a: any) => console.log("[practice]", ...a)

export function practiceRoutes(app: any) {
  app.post("/api/practice/find-question", async (req: any, res: any) => {
    try {
      const board = String(req.body?.board || "").trim()
      const subject = String(req.body?.subject || "").trim()
      const topic = String(req.body?.topic || "").trim()
      const availableSources = Array.isArray(req.body?.availableSources)
        ? req.body.availableSources
        : []

      if (!board || !subject) {
        return res.status(400).send({ ok: false, error: "board and subject required" })
      }
      if (!availableSources.length) {
        return res
          .status(400)
          .send({ ok: false, error: "availableSources required (no approved papers passed)" })
      }

      plog("find-question", { board, subject, topic, sources: availableSources.length })
      const question = await handleFindQuestion(board, subject, topic, availableSources)
      res.send(question)
    } catch (e: any) {
      plog("find-question error", e?.message || e)
      res.status(500).send({ ok: false, error: e?.message || "internal" })
    }
  })

  app.post("/api/practice/grade", async (req: any, res: any) => {
    try {
      const questionText = String(req.body?.questionText || "").trim()
      const studentAnswer = String(req.body?.studentAnswer || "").trim()

      if (!questionText || !studentAnswer) {
        return res
          .status(400)
          .send({ ok: false, error: "questionText and studentAnswer required" })
      }

      plog("grade", { questionRef: req.body?.questionRef })
      const graded = await handleGrade(questionText, studentAnswer)
      res.send(graded)
    } catch (e: any) {
      plog("grade error", e?.message || e)
      res.status(500).send({ ok: false, error: e?.message || "internal" })
    }
  })
}
