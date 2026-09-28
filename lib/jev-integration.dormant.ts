/**
 * DORMANT JEv INTEGRATION — cut over to Ollama in lib/links.ts.
 *
 * This file is intentionally not imported by the application. It preserves the last
 * TypeSafe implementation so it can be reinstated if Jev access reopens.
 */
import { choice, score, TypeSafeClient } from "@typesafe-ai/sdk";

export async function classifyWithJev(documentA: string, documentB: string) {
  const client = new TypeSafeClient();
  const response = await client.systemOne({
    model: "jev-latest",
    state: { documentA, documentB },
    questions: {
      relationType: choice("How does documentB relate to documentA?", {
        cites: "cites or refers to",
        contradicts: "disagrees with",
        extends: "builds on or extends",
        unrelated: "not meaningfully related",
      }),
      strength: score("How strong is the relationship from 1 to 5?", [
        "1 weak", "2 limited", "3 moderate", "4 strong", "5 direct",
      ]),
    },
  });
  return {
    relationType: response.answers.relationType.choice,
    relationConfidence: response.answers.relationType.confidence,
    strength: Math.max(1, Math.min(5, Math.round(response.answers.strength.score))),
    strengthConfidence: response.answers.strength.confidence,
    source: "jev" as const,
  };
}
