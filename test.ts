import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: "The amount of the transaction",
        },
        merchant: {
          type: Type.STRING,
          description: "The name of the merchant",
        },
        category: {
          type: Type.STRING,
          description: "A short category for the expense, e.g. Food, Transportation",
        },
        date: {
          type: Type.STRING,
          description: "The date of the transaction in YYYY-MM-DD format",
        },
        type: {
          type: Type.STRING,
          description: "Either 'income' or 'expense'",
        }
      },
      required: ["amount", "merchant", "category", "date", "type"],
    };

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Extract the transaction details from this text: "I bought groceries for 50 dollars". If a date is not mentioned, use today's date: ${new Date().toISOString().split('T')[0]}.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
        });
        console.log(response.text);
    } catch (e: any) {
        console.error(e.message);
    }
}
run();
