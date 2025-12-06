
import React, { useState, useCallback, useEffect } from 'react';
import { ReceiptView } from './components/ReceiptView';
import { ChatView } from './components/ChatView';
import { SummaryView } from './components/SummaryView';
import { HistorySidebar } from './components/HistorySidebar';
import { ReceiptData, Assignments, ChatMessage, SavedBill, LegacyAssignments, ReceiptItem, Group } from './types';
import { parseReceiptImage, processChatCommand } from './services/gemini';
import { MessageSquare, PieChart, Menu, Scissors } from 'lucide-react';

// Custom Brand Logo
const Logo = () => (
  <div className="relative w-8 h-8 flex items-center justify-center bg-indigo-600 rounded-lg shadow-sm overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700"></div>
    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30 border-r border-dashed border-white/50"></div>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white relative z-10">
       <path d="M16 3h5v5" />
       <path d="M8 3H3v5" />
       <path d="M12 22v-8.3" />
       <path d="m9 18 3 3 3-3" />
    </svg>
  </div>
);

export default function App() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [people, setPeople] = useState<string[]>([]); // List of all participants
  const [billName, setBillName] = useState<string>(''); // Name of the bill
  const [currentBillId, setCurrentBillId] = useState<string | null>(null); // Track active bill ID
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Upload a receipt to get started! You can assign items directly on the list or ask me for help.' }
  ]);

  // UI State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  // State for Group Summary Mode
  // If this is set, SummaryView shows the group aggregation instead of the current bill
  const [groupSummaryBills, setGroupSummaryBills] = useState<SavedBill[] | null>(null);

  // Load history and groups on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('bill_splitter_history');
      if (storedHistory) {
        setSavedBills(JSON.parse(storedHistory));
      }
      
      const storedGroups = localStorage.getItem('bill_splitter_groups');
      if (storedGroups) {
        setGroups(JSON.parse(storedGroups));
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  const saveHistoryToStorage = (bills: SavedBill[]) => {
    try {
      localStorage.setItem('bill_splitter_history', JSON.stringify(bills));
    } catch (e) {
      console.warn("Storage quota likely exceeded. Attempting to save without images.");
      const cleanBills = bills.map(b => ({ ...b, imageUrl: null }));
      try {
        localStorage.setItem('bill_splitter_history', JSON.stringify(cleanBills));
      } catch (err) {
        console.error("Critical: Could not save history even without images.", err);
      }
    }
  };

  const saveGroupsToStorage = (newGroups: Group[]) => {
    try {
      localStorage.setItem('bill_splitter_groups', JSON.stringify(newGroups));
    } catch (e) {
      console.error("Failed to save groups", e);
    }
  };

  // Helper to migrate legacy assignments
  const migrateAssignments = (old: Assignments | LegacyAssignments): Assignments => {
    const newAssignments: Assignments = {};
    Object.keys(old).forEach(key => {
        const idx = parseInt(key);
        const val = old[idx];
        if (Array.isArray(val)) {
            // It's legacy string[]
            newAssignments[idx] = {};
            val.forEach((person: string) => {
                newAssignments[idx][person] = 1;
            });
        } else {
            // It's already correct
            newAssignments[idx] = val as Record<string, number>;
        }
    });
    return newAssignments;
  };

  // Helper to create a bill object from current state
  const createCurrentBillObject = useCallback((): SavedBill | null => {
    if (!receiptData) return null;
    const total = ((receiptData.items.reduce((acc, i) => acc + i.price * i.quantity, 0)) + receiptData.tax + receiptData.tip).toFixed(2);
    const dateStr = new Date().toLocaleDateString();
    
    // Use user provided name or generate default
    const finalName = billName.trim() || `Bill ${dateStr} - ${receiptData.currency || '$'}${total}`;
    
    // Use existing ID if we are editing, otherwise generate new one
    const id = currentBillId || Date.now().toString();

    return {
      id,
      timestamp: Date.now(), // Update timestamp on save to show "Last updated" effectively? Or keep original creation? Let's update.
      name: finalName,
      receiptData,
      assignments,
      people,
      imageUrl: imageUrl,
      messages
    };
  }, [receiptData, assignments, imageUrl, messages, people, billName, currentBillId]);

  const handleSaveBill = useCallback((showToast = true) => {
    const newBill = createCurrentBillObject();
    if (!newBill) return;

    // If we just created this ID (it wasn't in state), set it now so future saves update this one.
    if (!currentBillId) {
      setCurrentBillId(newBill.id);
    }

    setSavedBills(prev => {
      const existingIndex = prev.findIndex(b => b.id === newBill.id);
      let updated;
      
      if (existingIndex !== -1) {
        // Update existing bill
        updated = [...prev];
        updated[existingIndex] = newBill;
      } else {
        // Add new bill
        updated = [newBill, ...prev];
      }
      
      saveHistoryToStorage(updated);
      return updated;
    });

    if (showToast) {
       const id = Date.now().toString();
       setMessages(prev => [...prev, { id, role: 'model', text: 'Bill saved to history!' }]);
    }
  }, [createCurrentBillObject, currentBillId]);

  // Auto-save effect
  useEffect(() => {
    // Only auto-save if we have data and it's not currently analyzing
    // handleSaveBill changes whenever state changes, so this effect runs on every state change
    if (receiptData && !isAnalyzing) {
      const timeoutId = setTimeout(() => {
        handleSaveBill(false);
      }, 1000); // 1s debounce

      return () => clearTimeout(timeoutId);
    }
  }, [handleSaveBill, receiptData, isAnalyzing]);

  const handleLoadBill = useCallback((bill: SavedBill) => {
    setReceiptData(bill.receiptData);
    setBillName(bill.name);
    setAssignments(migrateAssignments(bill.assignments));
    setPeople(bill.people || []); 
    setImageUrl(bill.imageUrl);
    setMessages(bill.messages || []);
    setCurrentBillId(bill.id); // Set the active ID so updates save to this bill
    
    // Reset group summary mode
    setGroupSummaryBills(null);

    // Close overlays
    setIsHistoryOpen(false);
    setIsSummaryOpen(false);
    setIsChatOpen(false);
  }, []);

  const handleDeleteBill = useCallback((id: string) => {
    setSavedBills(prev => {
      const updated = prev.filter(b => b.id !== id);
      saveHistoryToStorage(updated);
      return updated;
    });
    
    // Also remove from groups
    setGroups(prev => {
      const updated = prev.map(g => ({
        ...g,
        billIds: g.billIds.filter(bid => bid !== id)
      }));
      saveGroupsToStorage(updated);
      return updated;
    });

    // If we deleted the current bill, treat it as a new unsaved bill (or clear it? Keeping data allows re-saving as new)
    if (currentBillId === id) {
      setCurrentBillId(null);
    }
  }, [currentBillId]);

  const handleNewBill = useCallback(() => {
    // We can rely on auto-save, but doing an explicit save before clear ensures no data loss if debounce hasn't fired
    if (receiptData) {
      handleSaveBill(false); 
    }

    setReceiptData(null);
    setAssignments({});
    setPeople([]);
    setBillName('');
    setImageUrl(null);
    setMessages([{ id: Date.now().toString(), role: 'model', text: 'Ready for a new receipt! Upload one to begin.' }]);
    setCurrentBillId(null); // Clear ID for new bill
    
    setGroupSummaryBills(null);
    setIsSummaryOpen(false);
    setIsChatOpen(false);
  }, [receiptData, handleSaveBill]);

  const handleImageUpload = useCallback(async (file: File) => {
    // Save current before starting new
    if (receiptData) {
      handleSaveBill(false);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setImageUrl(base64Data);
      
      setIsAnalyzing(true);
      setReceiptData(null);
      setAssignments({});
      setPeople([]);
      setBillName(`Receipt ${new Date().toLocaleDateString()}`); 
      setCurrentBillId(null); // New image means new bill
      
      setGroupSummaryBills(null);
      setIsSummaryOpen(false);
      
      try {
        const pureBase64 = base64Data.split(',')[1];
        const mimeType = file.type;
        const data = await parseReceiptImage(pureBase64, mimeType);
        
        setReceiptData(data);
        setMessages([
          { id: Date.now().toString(), role: 'model', text: `I found ${data.items.length} items. You can tap items to assign them to people, or ask me for help!` }
        ]);
        // Auto-save effect will trigger here once receiptData is set
      } catch (error) {
        console.error(error);
        setMessages([
            { id: Date.now().toString(), role: 'model', text: "Sorry, I couldn't read the receipt properly. Please try again with a clearer image.", isError: true }
        ]);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }, [receiptData, handleSaveBill]);

  // --- Group Handlers ---

  const handleCreateGroup = useCallback((name: string) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      name,
      billIds: []
    };
    setGroups(prev => {
      const updated = [...prev, newGroup];
      saveGroupsToStorage(updated);
      return updated;
    });
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setGroups(prev => {
      const updated = prev.filter(g => g.id !== groupId);
      saveGroupsToStorage(updated);
      return updated;
    });
  }, []);

  const handleMoveBillToGroup = useCallback((billId: string, groupId: string | null) => {
    setGroups(prev => {
      const updated = prev.map(g => {
        // Remove from all groups first to avoid duplicates
        const newIds = g.billIds.filter(id => id !== billId);
        
        if (g.id === groupId) {
          return { ...g, billIds: [...newIds, billId] };
        }
        return { ...g, billIds: newIds };
      });
      saveGroupsToStorage(updated);
      return updated;
    });
  }, []);

  const handleViewTripSummary = useCallback((group: Group) => {
    // Collect all bills in this group
    const billsInGroup = savedBills.filter(b => group.billIds.includes(b.id));
    if (billsInGroup.length === 0) return;

    // Normalize assignments for all bills to ensure calculation works
    const normalizedBills = billsInGroup.map(b => ({
      ...b,
      assignments: migrateAssignments(b.assignments)
    }));

    setGroupSummaryBills(normalizedBills);
    setIsSummaryOpen(true);
    setIsHistoryOpen(false);
  }, [savedBills]);

  // --- End Group Handlers ---

  const handleSendMessage = useCallback(async (text: string) => {
    if (!receiptData) return;

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, newUserMsg]);
    setIsProcessingChat(true);

    try {
      const historyForService = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await processChatCommand(text, receiptData, assignments, historyForService);

      let newPeopleFound: string[] = [];

      if (response.updates.length > 0) {
        setAssignments(prev => {
          const next = { ...prev };
          response.updates.forEach(update => {
            const newAssignmentForIndex: Record<string, number> = {};
            
            update.assignedTo.forEach(assignment => {
              if (!people.includes(assignment.person) && !newPeopleFound.includes(assignment.person)) {
                newPeopleFound.push(assignment.person);
              }
              newAssignmentForIndex[assignment.person] = assignment.quantity;
            });

            if (Object.keys(newAssignmentForIndex).length === 0) {
               delete next[update.itemIndex];
            } else {
               next[update.itemIndex] = newAssignmentForIndex;
            }
          });
          return next;
        });
        
        if (newPeopleFound.length > 0) {
          setPeople(prev => [...Array.from(new Set([...prev, ...newPeopleFound]))]);
        }
      }

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response.reply }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "I'm having trouble understanding that. Could you rephrase?", isError: true }]);
    } finally {
      setIsProcessingChat(false);
    }
  }, [receiptData, assignments, messages, people]);

  const handleAddPerson = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPeople(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  }, []);

  const handleUpdateQuantity = useCallback((itemIndex: number, person: string, change: number) => {
    setAssignments(prev => {
      const next = { ...prev };
      const itemAssignments = { ...(next[itemIndex] || {}) };
      
      const currentQty = itemAssignments[person] || 0;
      const newQty = Math.max(0, currentQty + change);

      if (newQty === 0) {
        delete itemAssignments[person];
      } else {
        itemAssignments[person] = newQty;
      }

      if (Object.keys(itemAssignments).length === 0) {
        delete next[itemIndex];
      } else {
        next[itemIndex] = itemAssignments;
      }
      return next;
    });
  }, []);

  const handleToggleAssignment = useCallback((itemIndex: number, person: string) => {
    setAssignments(prev => {
       const next = { ...prev };
       const itemAssignments = { ...(next[itemIndex] || {}) };
       
       if (itemAssignments[person]) {
         delete itemAssignments[person];
       } else {
         itemAssignments[person] = 1;
       }

       if (Object.keys(itemAssignments).length === 0) {
        delete next[itemIndex];
      } else {
        next[itemIndex] = itemAssignments;
      }
      return next;
    });
  }, []);

  // --- Bulk Actions ---
  const handleBulkAssign = useCallback((indices: number[], assignees: string[]) => {
    if (assignees.length === 0) return;
    
    // Add any new people to the master list
    setPeople(prev => {
      const newPeople = assignees.filter(p => !prev.includes(p));
      if (newPeople.length === 0) return prev;
      return [...prev, ...newPeople];
    });

    setAssignments(prev => {
      const next = { ...prev };
      indices.forEach(idx => {
        const itemAssignments = { ...(next[idx] || {}) };
        assignees.forEach(person => {
           // Default to 1 if not exists. If exists, we keep current qty to not overwrite manual edits.
           if (!itemAssignments[person]) {
             itemAssignments[person] = 1;
           }
        });
        next[idx] = itemAssignments;
      });
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback((indices: number[]) => {
    const indicesSet = new Set(indices);

    setReceiptData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.filter((_, i) => !indicesSet.has(i))
      };
    });

    setAssignments(prev => {
      const next: Assignments = {};
      const oldIndices = Object.keys(prev).map(Number).sort((a, b) => a - b);
      
      oldIndices.forEach(oldIdx => {
          if (!indicesSet.has(oldIdx)) {
              // Calculate how many deleted items were before this index to shift it correctly
              const deletedBefore = indices.filter(deletedIdx => deletedIdx < oldIdx).length;
              const newIdx = oldIdx - deletedBefore;
              next[newIdx] = prev[oldIdx];
          }
      });
      return next;
    });
  }, []);

  const handleUpdateItem = useCallback((index: number, updatedItem: ReceiptItem) => {
    setReceiptData(prev => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  }, []);

  const handleAddItem = useCallback(() => {
    setReceiptData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: [...prev.items, { name: 'New Item', price: 0, quantity: 1 }]
      };
    });
  }, []);

  const handleDeleteItem = useCallback((indexToDelete: number) => {
    setReceiptData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== indexToDelete)
      };
    });

    setAssignments(prev => {
      const next: Assignments = {};
      Object.keys(prev).forEach(key => {
        const idx = parseInt(key);
        if (idx < indexToDelete) {
          next[idx] = prev[idx];
        } else if (idx > indexToDelete) {
          next[idx - 1] = prev[idx];
        }
      });
      return next;
    });
  }, []);

  const handleUpdateTaxTip = useCallback((tax: number, tip: number) => {
     setReceiptData(prev => {
       if (!prev) return null;
       return { ...prev, tax, tip };
     });
  }, []);

  const handleUpdateCurrency = useCallback((currency: string) => {
    setReceiptData(prev => {
      if (!prev) return null;
      return { ...prev, currency };
    });
  }, []);

  // Determine what to pass to SummaryView
  // If groupSummaryBills is set, we are in group mode.
  // Else we check for current receiptData.
  const summaryProps = groupSummaryBills 
    ? { bills: groupSummaryBills }
    : (receiptData ? { bills: [{ receiptData, assignments, name: billName || 'Current Bill' } as SavedBill] } : { bills: [] });

  return (
    <div className="h-full bg-slate-100 flex flex-col relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsHistoryOpen(true)}
             className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
             title="History"
          >
             <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Logo />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">BayarTengah</h1>
          </div>
        </div>
        
        <div className="flex gap-2">
           {receiptData && (
             <>
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium border ${isChatOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="hidden sm:inline">AI Chat</span>
                </button>

                <button
                  onClick={() => {
                    setGroupSummaryBills(null); // Switch back to current bill summary
                    setIsSummaryOpen(!isSummaryOpen);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium border ${isSummaryOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <PieChart className="w-5 h-5" />
                  <span className="hidden sm:inline">Summary</span>
                </button>
             </>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="max-w-3xl mx-auto h-full shadow-xl bg-white flex flex-col">
           <ReceiptView 
            receiptData={receiptData}
            assignments={assignments}
            people={people}
            isAnalyzing={isAnalyzing}
            onImageUpload={handleImageUpload}
            imageUrl={imageUrl}
            onNewBill={handleNewBill}
            onAddPerson={handleAddPerson}
            onToggleAssignment={handleToggleAssignment}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onUpdateTaxTip={handleUpdateTaxTip}
            onUpdateCurrency={handleUpdateCurrency}
            billName={billName}
            onBillNameChange={setBillName}
            onBulkAssign={handleBulkAssign}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      </div>

      {/* Overlays */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedBills={savedBills}
        onLoadBill={handleLoadBill}
        onDeleteBill={handleDeleteBill}
        groups={groups}
        onCreateGroup={handleCreateGroup}
        onDeleteGroup={handleDeleteGroup}
        onMoveBillToGroup={handleMoveBillToGroup}
        onViewTripSummary={handleViewTripSummary}
      />

      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-40 transform transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatView 
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessingChat}
            receiptLoaded={!!receiptData}
            onClose={() => setIsChatOpen(false)}
        />
      </div>

      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-slate-900 shadow-2xl z-40 transform transition-transform duration-300 ${isSummaryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <SummaryView 
          bills={summaryProps.bills}
          onSave={groupSummaryBills ? undefined : () => handleSaveBill(true)}
          onClose={() => setIsSummaryOpen(false)}
          isGroupView={!!groupSummaryBills}
        />
      </div>

      {(isChatOpen || isSummaryOpen) && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 sm:hidden" 
          onClick={() => { setIsChatOpen(false); setIsSummaryOpen(false); }}
        />
      )}
    </div>
  );
}
