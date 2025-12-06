
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, AssignmentUpdate, Assignments, ReceiptItem, ChatResponse } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RECEIPT_MODEL = 'gemini-2.0-flash';
const CHAT_MODEL = 'gemini-2.0-flash';

/**
 * Parses a receipt image to extract items, tax, and tip.
 */
export const parseReceiptImage = async (base64Image: string, mimeType: string): Promise<ReceiptData> => {
  try {
    const response = await ai.models.generateContent({
      model: RECEIPT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `Analyze this receipt image. Extract all purchased items with their individual price (unit price) and quantity. 
            Also extract the total tax amount and total tip amount found on the receipt.
            If specific tax or tip amounts are not explicitly listed, return 0 for them.
            Return the data in a strict JSON format matching the schema.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER, description: "Price of a single unit" },
                  quantity: { type: Type.NUMBER, description: "Quantity of items" },
                },
                required: ["name", "price", "quantity"],
              },
            },
            tax: { type: Type.NUMBER },
            tip: { type: Type.NUMBER },
            currency: { type: Type.STRING, description: "Currency symbol if found, e.g., $" },
          },
          required: ["items", "tax", "tip"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ReceiptData;
    }
    throw new Error("No data returned from Gemini");
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};

/**
 * Interprets a user's natural language command to update assignments.
 */
export const processChatCommand = async (
  message: string,
  receiptData: ReceiptData,
  currentAssignments: Assignments,
  chatHistory: { role: string; parts: { text: string }[] }[]
): Promise<ChatResponse> => {
  try {
    // Construct a context-aware prompt
    const itemsListString = receiptData.items
      .map((item, index) => `Index ${index}: ${item.quantity}x ${item.name} @ ${item.price}`)
      .join("\n");

    const assignmentsString = JSON.stringify(currentAssignments);

    const systemInstruction = `
      You are a smart bill splitting assistant.
      You have access to a list of items from a receipt (indexed 0 to N).
      The user will speak naturally to assign items to people.
      
      Current Items:
      ${itemsListString}

      Current Assignments (Item Index -> { PersonName: Quantity }):
      ${assignmentsString}

      Your Goal:
      1. Understand who is paying for which item and HOW MANY they are paying for.
      2. Return a JSON object with:
         - 'reply': A short, friendly confirmation (e.g., "Assigned 4 tacos to Tom.").
         - 'updates': An array of objects, where each object has:
            - 'itemIndex': The integer index of the item.
            - 'assignedTo': The NEW complete list of people assigned to this item, with their quantities.
      
      Rules:
      - If a user says "Tom had 4 tacos" (and tacos are Index 0), return updates for index 0 with assignments: [{person: "Tom", quantity: 4}].
      - If user says "Tom and Bob shared the pizza", imply quantity 1 for each (unless pizza quantity is large, then try to split evenly or default to 1). 
      - If user says "Add Alice to the pizza", and Tom (1) is already there, return Tom (1), Alice (1).
      - If the user refers to an item ambiguously, try to infer the most likely item.
      - Default quantity is 1 if not specified.
    `;

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: [
        ...chatHistory, // Pass previous context
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            updates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemIndex: { type: Type.INTEGER },
                  assignedTo: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        person: { type: Type.STRING },
                        quantity: { type: Type.NUMBER }
                      },
                      required: ["person", "quantity"]
                    }
                  }
                },
                required: ["itemIndex", "assignedTo"]
              }
            }
          },
          required: ["reply", "updates"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ChatResponse;
    }
    throw new Error("No response from Gemini");

  } catch (error) {
    console.error("Error processing chat:", error);
    throw error;
  }
};
