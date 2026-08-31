import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  filename: z.string(),
  /** קובץ PDF / תמונה כ-data URL */
  dataUrl: z.string().optional(),
  /** תוכן טקסטואלי (CSV / TXT / Excel שהומר לטקסט) */
  text: z.string().optional(),
});

export type ParsedBoqItem = {
  code?: string;
  description: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
};

const SYSTEM = `אתה מחלץ כתבי כמויות (BOQ) מקבצים.
החזר JSON בלבד עם המפתח items — מערך של שורות כתב הכמויות.
לכל שורה: code (מספר סעיף אם קיים), description (תיאור הפריט), unit (יחידת מידה: יח', מ', מ"ר, קומפ' וכו'), quantity (כמות כמספר), unitPrice (מחיר ליחידה בש"ח כמספר, ללא סימנים).
התעלם משורות כותרת, סיכומים, מע"מ ושורות ריקות.
אם מחיר או כמות לא מופיעים — החזר 0.`;

export const parseBoqFile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ParsedBoqItem[]> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    const base = process.env["AGW_URL"] ?? "https://ai.gateway.lovable.dev";
    if (!apiKey) throw new Error("שירות ה-AI אינו מוגדר.");
    if (!data.dataUrl && !data.text) throw new Error("לא התקבל תוכן לקריאה.");

    const content: unknown[] = [
      { type: "text", text: "חלץ את כל שורות כתב הכמויות מהקובץ המצורף." },
    ];
    if (data.text) {
      content.push({ type: "text", text: data.text.slice(0, 120000) });
    } else if (data.dataUrl?.startsWith("data:image")) {
      content.push({ type: "image_url", image_url: { url: data.dataUrl } });
    } else if (data.dataUrl) {
      content.push({
        type: "file",
        file: { filename: data.filename, file_data: data.dataUrl },
      });
    }

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
          { role: "user", content },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "boq",
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      description: { type: "string" },
                      unit: { type: "string" },
                      quantity: { type: "number" },
                      unitPrice: { type: "number" },
                    },
                    required: ["description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
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
      throw new Error(`שגיאה בקריאת הקובץ (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { items?: ParsedBoqItem[] };
      return (parsed.items ?? []).filter((i) => i.description?.trim());
    } catch {
      throw new Error("לא הצלחתי לפענח את תוכן כתב הכמויות.");
    }
  });
