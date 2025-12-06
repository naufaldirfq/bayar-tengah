
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Plus, Check, ChevronDown, ChevronUp, Sparkles, Minus, Pencil, Trash2, ListChecks, Users, X, Split, AlertCircle } from 'lucide-react';
import { ReceiptData, Assignments, ReceiptItem } from '../types';

interface ReceiptViewProps {
  receiptData: ReceiptData | null;
  assignments: Assignments;
  people: string[];
  isAnalyzing: boolean;
  onImageUpload: (file: File) => void;
  imageUrl: string | null;
  onNewBill: () => void;
  onAddPerson: (name: string) => void;
  onToggleAssignment: (itemIndex: number, person: string) => void;
  onUpdateQuantity: (itemIndex: number, person: string, change: number) => void;
  
  // Edit Handlers
  onUpdateItem: (index: number, item: ReceiptItem) => void;
  onAddItem: () => void;
  onDeleteItem: (index: number) => void;
  onUpdateTaxTip: (tax: number, tip: number) => void;
  onUpdateCurrency: (currency: string) => void;

  // Bill Name
  billName: string;
  onBillNameChange: (name: string) => void;

  // Bulk Actions
  onBulkAssign: (indices: number[], people: string[]) => void;
  onBulkDelete?: (indices: number[]) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'IDR', symbol: 'Rp', label: 'IDR (Rp)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  { code: 'KRW', symbol: '₩', label: 'KRW (₩)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
];

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  receiptData,
  assignments,
  people,
  isAnalyzing,
  onImageUpload,
  imageUrl,
  onNewBill,
  onAddPerson,
  onToggleAssignment,
  onUpdateQuantity,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onUpdateTaxTip,
  onUpdateCurrency,
  billName,
  onBillNameChange,
  onBulkAssign,
  onBulkDelete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkPeople, setBulkPeople] = useState<string[]>([]); // People selected in bulk modal

  // Reset states when receipt changes
  useEffect(() => {
    setIsEditing(false);
    setIsSelectionMode(false);
    setSelectedIndices(new Set());
  }, [receiptData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const getAssignmentsForItem = (index: number) => {
    const itemAssignments = assignments[index];
    if (!itemAssignments || Object.keys(itemAssignments).length === 0) return null;
    return itemAssignments;
  };

  const handleAddPersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      onAddPerson(newPersonName.trim());
      if (expandedItemIndex !== null) {
        onToggleAssignment(expandedItemIndex, newPersonName.trim());
      }
      setNewPersonName('');
    }
  };

  const toggleItemExpansion = (idx: number) => {
    if (isEditing || isSelectionMode) return;
    if (expandedItemIndex === idx) {
      setExpandedItemIndex(null);
    } else {
      setExpandedItemIndex(idx);
    }
  };

  const toggleSelection = (idx: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) {
        newSet.delete(idx);
    } else {
        newSet.add(idx);
    }
    setSelectedIndices(newSet);
  };

  const handleSelectAll = () => {
    if (!receiptData) return;
    if (selectedIndices.size === receiptData.items.length) {
        setSelectedIndices(new Set());
    } else {
        setSelectedIndices(new Set(receiptData.items.map((_, i) => i)));
    }
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string) => {
    if (!receiptData) return;
    const item = { ...receiptData.items[index] };
    
    if (field === 'name') {
      item.name = value;
    } else {
      const num = parseFloat(value);
      item[field] = isNaN(num) ? 0 : num;
    }
    onUpdateItem(index, item);
  };

  const handleBulkSubmit = () => {
    if (bulkPeople.length > 0 && selectedIndices.size > 0) {
        onBulkAssign(Array.from(selectedIndices), bulkPeople);
        setIsBulkAssignModalOpen(false);
        setBulkPeople([]);
        setIsSelectionMode(false);
        setSelectedIndices(new Set());
    }
  };

  const toggleBulkPerson = (person: string) => {
    if (bulkPeople.includes(person)) {
        setBulkPeople(prev => prev.filter(p => p !== person));
    } else {
        setBulkPeople(prev => [...prev, person]);
    }
  };

  const handleAddBulkPerson = (name: string) => {
     const trimmed = name.trim();
     if(trimmed) {
         if (!people.includes(trimmed)) {
             onAddPerson(trimmed);
         }
         if (!bulkPeople.includes(trimmed)) {
             setBulkPeople(prev => [...prev, trimmed]);
         }
         setNewPersonName('');
     }
  };

  const handleSplitEveryone = () => {
      if (people.length > 0 && selectedIndices.size > 0) {
          onBulkAssign(Array.from(selectedIndices), people);
          setIsSelectionMode(false);
          setSelectedIndices(new Set());
      }
  };

  const handleDeleteSelected = () => {
      if (selectedIndices.size > 0 && onBulkDelete) {
          if (confirm(`Delete ${selectedIndices.size} selected items?`)) {
            onBulkDelete(Array.from(selectedIndices));
            setSelectedIndices(new Set());
          }
      }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Inside View */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sticky top-0 z-20">
        <div className="flex-1 min-w-0">
          {receiptData ? (
             <div className="relative group">
                <input
                  type="text"
                  value={billName}
                  onChange={(e) => onBillNameChange(e.target.value)}
                  className="text-2xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full truncate py-1"
                  placeholder="Enter Bill Name"
                />
                <Pencil className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
             </div>
          ) : (
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Upload Receipt
            </h2>
          )}
          
          <p className="text-slate-500 text-sm mt-1">
            {receiptData 
              ? (isEditing 
                  ? 'Editing items and prices' 
                  : isSelectionMode 
                     ? 'Select items for bulk actions'
                     : 'Tap an item below to assign it') 
              : 'Upload an image to start splitting'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
           {receiptData && (
             <>
               <div className="relative">
                 <select
                    value={receiptData.currency || '$'}
                    onChange={(e) => onUpdateCurrency(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-full focus:ring-indigo-500 focus:border-indigo-500 block py-2 px-3 pr-8 font-medium appearance-none cursor-pointer hover:bg-slate-100 transition-colors shadow-sm"
                    style={{ backgroundImage: 'none' }}
                 >
                   {CURRENCIES.map(c => (
                     <option key={c.code} value={c.symbol}>{c.code} ({c.symbol})</option>
                   ))}
                   {!CURRENCIES.some(c => c.symbol === receiptData.currency) && (
                     <option value={receiptData.currency}>{receiptData.currency}</option>
                   )}
                 </select>
                 <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>

               {/* Selection Mode Toggle */}
               <button
                 onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setIsEditing(false); // Exclusive modes
                    setSelectedIndices(new Set());
                 }}
                 className={`text-sm px-4 py-2 rounded-full transition-colors flex items-center gap-2 font-medium ${isSelectionMode ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
               >
                 {isSelectionMode ? <Check className="w-4 h-4" /> : <ListChecks className="w-4 h-4" />}
                 {isSelectionMode ? 'Done' : 'Select'}
               </button>

               {/* Edit Mode Toggle */}
               <button
                 onClick={() => {
                    setIsEditing(!isEditing);
                    setIsSelectionMode(false); // Exclusive modes
                 }}
                 className={`text-sm px-4 py-2 rounded-full transition-colors flex items-center gap-2 font-medium ${isEditing ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
               >
                 {isEditing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                 {isEditing ? 'Done' : 'Edit'}
               </button>

               {!isEditing && !isSelectionMode && (
                 <button
                   onClick={onNewBill}
                   className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full transition-colors flex items-center gap-2 font-medium"
                 >
                   <Plus className="w-4 h-4" />
                   New
                 </button>
               )}
             </>
           )}
           
           <button
             onClick={() => fileInputRef.current?.click()}
             className={`text-sm ${receiptData ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'} px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 font-medium`}
           >
             <Upload className="w-4 h-4" />
             {receiptData ? 'Retake' : 'Upload Image'}
           </button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty State */}
        {!receiptData && !isAnalyzing && !imageUrl && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-xl font-medium text-slate-600">No receipt yet</p>
            <p className="text-sm max-w-sm mx-auto mt-2">Take a photo of your bill or upload a screenshot to automatically detect items and prices.</p>
            <button
               onClick={() => fileInputRef.current?.click()}
               className="mt-6 text-indigo-600 font-medium hover:underline"
            >
              Select a file
            </button>
          </div>
        )}

        {/* Parsing State */}
        {isAnalyzing && (
          <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/30">
            <div className="relative mb-8">
               <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
               <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
               </div>
            </div>

            <div className="text-center space-y-2 z-10 mb-10">
              <h3 className="text-xl font-bold text-slate-800">Analyzing Receipt</h3>
              <p className="text-slate-500 text-sm">Gemini is extracting items and prices...</p>
            </div>

            {imageUrl && (
              <div className="relative w-48 aspect-[2/3] bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-200 transform -rotate-2">
                 <img src={imageUrl} alt="Scanning" className="w-full h-full object-cover opacity-50 grayscale blur-[1px]" />
                 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            )}
            <style>{`
              @keyframes scan {
                0% { top: -5%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 105%; opacity: 0; }
              }
            `}</style>
          </div>
        )}

        {/* Parsed Receipt View */}
        {receiptData && !isAnalyzing && (
          <div className="pb-8">
            {/* Image Banner */}
            {imageUrl && !isEditing && !isSelectionMode && (
              <div className="w-full h-48 bg-slate-100 relative group overflow-hidden border-b border-slate-200">
                <img src={imageUrl} alt="Receipt" className="w-full h-full object-contain mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            <div className="bg-white">
               {/* Items Header */}
               <div className={`grid ${isSelectionMode ? 'grid-cols-[auto_1fr_auto_auto_auto]' : 'grid-cols-12'} gap-2 p-4 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 items-center`}>
                  {isSelectionMode && (
                     <div className="w-8 flex items-center justify-center">
                        <input type="checkbox" onChange={handleSelectAll} checked={receiptData.items.length > 0 && selectedIndices.size === receiptData.items.length} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                     </div>
                  )}
                  <div className={isSelectionMode ? "" : "col-span-6 sm:col-span-6"}>Item</div>
                  <div className={isSelectionMode ? "text-center w-12" : "col-span-2 sm:col-span-2 text-center"}>Qty</div>
                  <div className={isSelectionMode ? "text-right w-16" : "col-span-2 sm:col-span-2 text-right"}>Price</div>
                  <div className={isSelectionMode ? "w-16 pl-2" : "col-span-2 sm:col-span-2 pl-2"}></div>
               </div>
               
               <div className="divide-y divide-slate-100">
                  {receiptData.items.map((item, idx) => {
                    const itemAssignments = getAssignmentsForItem(idx);
                    const assignedNames = itemAssignments ? Object.keys(itemAssignments) : [];
                    const isExpanded = expandedItemIndex === idx && !isEditing && !isSelectionMode;
                    const isSelected = selectedIndices.has(idx);

                    return (
                      <div key={idx} className={`transition-all ${isExpanded ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'} ${isSelected && isSelectionMode ? 'bg-indigo-50/30' : ''}`}>
                        {/* Main Row */}
                        <div 
                          className={`grid ${isSelectionMode ? 'grid-cols-[auto_1fr_auto_auto_auto]' : 'grid-cols-12'} gap-2 p-4 items-center ${!isEditing && !isSelectionMode ? 'cursor-pointer group' : ''} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                              if (isSelectionMode) toggleSelection(idx);
                              else toggleItemExpansion(idx);
                          }}
                        >
                          {isSelectionMode && (
                              <div className="w-8 flex items-center justify-center">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    onChange={() => toggleSelection(idx)}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                              </div>
                          )}

                          {isEditing ? (
                            // Edit Mode Rows (uses old grid)
                            <>
                              <div className="col-span-6 sm:col-span-6">
                                <input 
                                  type="text" 
                                  value={item.name}
                                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                  className="w-full text-sm border-b border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                                />
                              </div>
                              <div className="col-span-2 sm:col-span-2">
                                <input 
                                  type="number" 
                                  value={item.quantity}
                                  min="1"
                                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                  className="w-full text-sm text-center border-b border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                                />
                              </div>
                              <div className="col-span-2 sm:col-span-2 text-right">
                                <input 
                                  type="number" 
                                  value={item.price}
                                  min="0"
                                  step="0.01"
                                  onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                  className="w-full text-sm text-right border-b border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                                />
                              </div>
                              <div className="col-span-2 sm:col-span-2 flex justify-center">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onDeleteItem(idx); }}
                                   className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                            </>
                          ) : (
                            // Read-Only / Assign Mode Rows (handles both grids via dynamic class)
                            <>
                              <div className={isSelectionMode ? "" : "col-span-6 sm:col-span-6"}>
                                <div className="font-semibold text-slate-800 text-base">{item.name}</div>
                                {item.quantity > 1 && (
                                  <div className="text-xs text-slate-500 font-medium sm:hidden">x{item.quantity}</div>
                                )}
                              </div>
                              <div className={isSelectionMode ? "text-center w-12 text-sm text-slate-600 font-medium" : "col-span-2 sm:col-span-2 text-center text-sm text-slate-600 font-medium"}>
                                {item.quantity}
                              </div>
                              <div className={isSelectionMode ? "text-right w-16 font-mono text-slate-700 font-medium" : "col-span-2 sm:col-span-2 text-right font-mono text-slate-700 font-medium"}>
                                {receiptData.currency || '$'}{(item.price * item.quantity).toFixed(2)}
                              </div>
                              <div className={isSelectionMode ? "w-16 pl-2 flex justify-end" : "col-span-2 sm:col-span-2 pl-2 flex justify-end sm:justify-start items-center gap-2"}>
                                 {assignedNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 justify-end sm:justify-start">
                                      {assignedNames.slice(0, isSelectionMode ? 1 : 3).map((name, i) => {
                                         const qty = itemAssignments![name];
                                         return (
                                          <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                            {name.charAt(0).toUpperCase()}
                                            {qty > 1 && <span className="ml-0.5 text-[10px] opacity-75">×{qty}</span>}
                                          </span>
                                         );
                                      })}
                                      {assignedNames.length > (isSelectionMode ? 1 : 3) && (
                                         <span className="text-xs text-slate-400">+{assignedNames.length - (isSelectionMode ? 1 : 3)}</span>
                                      )}
                                    </div>
                                 ) : (
                                   <span className={`text-xs text-slate-400 italic ${isSelectionMode ? 'hidden' : 'hidden sm:inline'}`}>Unassigned</span>
                                 )}
                                 {!isSelectionMode && (
                                     <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                     </div>
                                 )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expanded Assignment Section */}
                        {isExpanded && (
                          <div className="px-4 pb-6 pt-2 border-t border-indigo-100 bg-indigo-50/30 cursor-default" onClick={e => e.stopPropagation()}>
                            
                            {/* Detailed List for Quantities */}
                            <div className="space-y-2 mb-4">
                              {assignedNames.length > 0 && (
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Quantities</div>
                              )}
                              
                              {assignedNames.map(person => {
                                const qty = itemAssignments![person];
                                return (
                                  <div key={person} className="flex items-center justify-between bg-white rounded-lg p-2 border border-indigo-100 shadow-sm">
                                    <span className="font-medium text-slate-700">{person}</span>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => onUpdateQuantity(idx, person, -1)}
                                        className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-sm font-bold w-4 text-center">{qty}</span>
                                      <button 
                                        onClick={() => onUpdateQuantity(idx, person, 1)}
                                        className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Quick Add</div>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {people.map((person) => {
                                const isAssigned = assignedNames.includes(person);
                                return (
                                  <button
                                    key={person}
                                    onClick={() => onToggleAssignment(idx, person)}
                                    className={`
                                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                                      ${isAssigned 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}
                                    `}
                                  >
                                    {isAssigned && <Check className="w-3.5 h-3.5" />}
                                    {person}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Add Person Input */}
                            <form onSubmit={handleAddPersonSubmit} className="flex gap-2 max-w-sm">
                                <input
                                  type="text"
                                  value={newPersonName}
                                  onChange={(e) => setNewPersonName(e.target.value)}
                                  placeholder="Add person (e.g. John)"
                                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <button 
                                  type="submit"
                                  disabled={!newPersonName.trim()}
                                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Add
                                </button>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
               </div>

               {/* Add Item Button */}
               {isEditing && (
                 <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button 
                      onClick={onAddItem}
                      className="w-full py-2 border-2 border-dashed border-indigo-200 rounded-lg text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                 </div>
               )}
               
               {/* Totals Section */}
               <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-2 mt-auto">
                  <div className="flex justify-between text-slate-600 max-w-xs ml-auto items-center">
                    <span>Subtotal</span>
                    <span>{receiptData.currency || '$'}{(receiptData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)).toFixed(2)}</span>
                  </div>
                  
                  {isEditing ? (
                    <>
                      <div className="flex justify-between text-slate-600 max-w-xs ml-auto items-center">
                        <span>Tax</span>
                        <input 
                           type="number" 
                           value={receiptData.tax}
                           onChange={(e) => onUpdateTaxTip(parseFloat(e.target.value) || 0, receiptData.tip)}
                           className="w-20 text-right text-sm border-b border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>
                      <div className="flex justify-between text-slate-600 max-w-xs ml-auto items-center">
                        <span>Tip</span>
                        <input 
                           type="number" 
                           value={receiptData.tip}
                           onChange={(e) => onUpdateTaxTip(receiptData.tax, parseFloat(e.target.value) || 0)}
                           className="w-20 text-right text-sm border-b border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600 max-w-xs ml-auto">
                        <span>Tax</span>
                        <span>{receiptData.currency || '$'}{receiptData.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 max-w-xs ml-auto">
                        <span>Tip</span>
                        <span>{receiptData.currency || '$'}{receiptData.tip.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between font-bold text-xl text-slate-900 pt-4 border-t border-slate-200 mt-4 max-w-xs ml-auto">
                    <span>Total</span>
                    <span>{receiptData.currency || '$'}{((receiptData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)) + receiptData.tax + receiptData.tip).toFixed(2)}</span>
                  </div>
               </div>
            </div>

            {/* Bulk Assign Modal */}
            {isBulkAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Assign Selected Items</h3>
                            <button onClick={() => setIsBulkAssignModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">Select people to assign to the {selectedIndices.size} selected items. This will add them to the existing split.</p>
                            
                            <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto">
                                {people.map(person => (
                                    <button
                                        key={person}
                                        onClick={() => toggleBulkPerson(person)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                            bulkPeople.includes(person)
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}
                                        }`}
                                    >
                                        {bulkPeople.includes(person) && <Check className="w-3.5 h-3.5" />}
                                        {person}
                                    </button>
                                ))}
                                {people.length === 0 && <span className="text-sm text-slate-400 italic">No people added yet. Type below to add.</span>}
                            </div>

                            <div className="flex gap-2 mb-6">
                                <input
                                  type="text"
                                  value={newPersonName}
                                  onChange={(e) => setNewPersonName(e.target.value)}
                                  placeholder="Add new person..."
                                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button 
                                  onClick={(e) => { e.preventDefault(); handleAddBulkPerson(newPersonName); }}
                                  disabled={!newPersonName.trim()}
                                  className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                                >
                                  Add
                                </button>
                            </div>

                            <button 
                                onClick={handleBulkSubmit}
                                disabled={bulkPeople.length === 0}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Apply Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Bulk Actions Bar */}
      {isSelectionMode && (
          <div className="border-t border-slate-200 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
                  <div className="font-semibold text-slate-700 text-sm whitespace-nowrap">
                      {selectedIndices.size} selected
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                      {/* Delete */}
                      <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedIndices.size === 0}
                        className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 disabled:bg-slate-50 disabled:text-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                      </button>

                      <div className="w-px h-6 bg-slate-200 mx-1"></div>

                      {/* Split Everyone */}
                      <button 
                        onClick={handleSplitEveryone}
                        disabled={selectedIndices.size === 0 || people.length === 0}
                        className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:bg-slate-50 disabled:text-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        title="Assign all participants to selected items"
                      >
                          <Split className="w-3.5 h-3.5" />
                          Split Everyone
                      </button>

                      {/* Assign To */}
                      <button 
                        onClick={() => setIsBulkAssignModalOpen(true)}
                        disabled={selectedIndices.size === 0}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-200 disabled:shadow-none whitespace-nowrap"
                      >
                          <Users className="w-3.5 h-3.5" />
                          Assign To...
                      </button>
                  </div>
              </div>
              {people.length === 0 && selectedIndices.size > 0 && (
                 <div className="max-w-3xl mx-auto mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Add people via "New Bill" or chat to use Split Everyone.
                 </div>
              )}
          </div>
      )}
    </div>
  );
};
