import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  filename: z.string(),
  dataUrl: z.string(),
});

export type ParsedServiceCall = {
  client?: string;
  project?: string;
  subject?: string;
  description?: string;
  contact?: string;
  address?: string;
  priority?: "low" | "normal" | "high";
};

const SYSTEM = `אתה עוזר שמחלץ נתונים מקריאות שירות של חברת "דלק מוטורס" (PDF).
החזר JSON בלבד לפי הסכימה. אם שדה לא קיים בקובץ — השמט אותו.
client = שם הלקוח (ברירת מחדל: "דלק מוטורס" אם מדובר בקריאה שלהם).
project = שם האתר / הסניף / התחנה.
subject = מהות הקריאה במשפט קצר.
description = תיאור מפורט של התקלה וכל פרט רלוונטי (מספר קריאה של הלקוח, תאריך, הערות).
contact = שם וטלפון של איש הקשר בשטח.
address = כתובת האתר.
priority = low | normal | high לפי דחיפות המצוינת.`;

export const parseDalekServicePdf = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ParsedServiceCall> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    const base = process.env["AGW_URL"] ?? "https://ai.gateway.lovable.dev";
    if (!apiKey) throw new Error("שירות ה-AI אינו מוגדר.");

    const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "חלץ את פרטי קריאת השירות מהקובץ המצורף." },
              {
                type: "file",
                file: { filename: data.filename, file_data: data.dataUrl },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "service_call",
            schema: {
              type: "object",
              properties: {
                client: { type: "string" },
                project: { type: "string" },
                subject: { type: "string" },
                description: { type: "string" },
                contact: { type: "string" },
                address: { type: "string" },
                priority: { type: "string", enum: ["low", "normal", "high"] },
              },
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("יותר מדי בקשות — נסה שוב בעוד רגע.");
      if (res.status === 402) throw new Error("נגמרו קרדיטי ה-AI בחשבון.");
      throw new Error(`שגיאה בקריאת ה-PDF (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return JSON.parse(cleaned) as ParsedServiceCall;
    } catch {
      throw new Error("לא הצלחתי לפענח את תוכן הקובץ.");
    }
  });
