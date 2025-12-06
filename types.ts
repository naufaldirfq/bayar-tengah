
export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  tax: number;
  tip: number;
  currency?: string;
}

export interface AssignmentUpdate {
  itemIndex: number;
  assignedTo: { person: string; quantity: number }[];
}

export interface ChatResponse {
  reply: string;
  updates: AssignmentUpdate[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface PersonSummary {
  name: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: string[];
}

// Map Item Index -> { PersonName: Quantity }
export type Assignments = Record<number, Record<string, number>>;

// Helper for backward compatibility with old Record<number, string[]>
export type LegacyAssignments = Record<number, string[]>;

export interface SavedBill {
  id: string;
  timestamp: number;
  name: string;
  receiptData: ReceiptData;
  assignments: Assignments | LegacyAssignments; 
  people: string[];
  imageUrl: string | null;
  messages: ChatMessage[];
}

export interface Group {
  id: string;
  name: string;
  billIds: string[];
}
