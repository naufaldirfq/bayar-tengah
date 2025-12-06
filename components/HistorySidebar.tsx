
import React, { useState } from 'react';
import { X, Clock, Trash2, ArrowRight, FileText, FolderPlus, Folder, MoreVertical, LayoutGrid, ChevronRight, ChevronDown } from 'lucide-react';
import { SavedBill, Group } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  savedBills: SavedBill[];
  onLoadBill: (bill: SavedBill) => void;
  onDeleteBill: (id: string) => void;
  
  // Group Props
  groups: Group[];
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveBillToGroup: (billId: string, groupId: string | null) => void;
  onViewTripSummary: (group: Group) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  savedBills,
  onLoadBill,
  onDeleteBill,
  groups,
  onCreateGroup,
  onDeleteGroup,
  onMoveBillToGroup,
  onViewTripSummary
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Identify bills that are already in a group
  const groupedBillIds = new Set(groups.flatMap(g => g.billIds));
  const uncategorizedBills = savedBills.filter(b => !groupedBillIds.has(b.id));

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Trips & History
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Create Group */}
            <form onSubmit={handleCreateGroupSubmit} className="flex gap-2">
               <input
                 type="text"
                 value={newGroupName}
                 onChange={(e) => setNewGroupName(e.target.value)}
                 placeholder="New Trip Name..."
                 className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
               />
               <button 
                 type="submit"
                 disabled={!newGroupName.trim()}
                 className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors disabled:opacity-50"
               >
                 <FolderPlus className="w-5 h-5" />
               </button>
            </form>

            {/* Groups Section */}
            {groups.length > 0 && (
               <div className="space-y-3">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Folder className="w-3 h-3" />
                   Trips
                 </h3>
                 {groups.map(group => {
                   const isExpanded = expandedGroups[group.id];
                   const billsInGroup = savedBills.filter(b => group.billIds.includes(b.id));
                   const total = billsInGroup.reduce((sum, b) => {
                      const t = b.receiptData.items.reduce((acc, i) => acc + i.price * i.quantity, 0) + b.receiptData.tax + b.receiptData.tip;
                      return sum + t;
                   }, 0);
                   const currency = billsInGroup[0]?.receiptData.currency || '$';

                   return (
                     <div key={group.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div 
                          className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleGroup(group.id)}
                        >
                           <div className="flex items-center gap-2 overflow-hidden">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                              <div className="truncate">
                                 <div className="font-semibold text-slate-700 text-sm">{group.name}</div>
                                 <div className="text-xs text-slate-400">{billsInGroup.length} bills • {currency}{total.toFixed(2)}</div>
                              </div>
                           </div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                             className="text-slate-300 hover:text-red-500 p-1"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                        
                        {isExpanded && (
                          <div className="bg-white p-2 border-t border-slate-100 space-y-2">
                             {billsInGroup.length > 0 ? (
                               <>
                                 <button
                                   onClick={() => onViewTripSummary(group)}
                                   className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg mb-2 flex items-center justify-center gap-1"
                                 >
                                    <LayoutGrid className="w-3 h-3" /> View Trip Summary
                                 </button>
                                 <div className="space-y-2">
                                    {billsInGroup.map(bill => (
                                      <BillCard 
                                        key={bill.id} 
                                        bill={bill} 
                                        onLoad={() => { onLoadBill(bill); onClose(); }} 
                                        onDelete={onDeleteBill}
                                        currentGroupId={group.id}
                                        allGroups={groups}
                                        onMove={onMoveBillToGroup}
                                      />
                                    ))}
                                 </div>
                               </>
                             ) : (
                               <div className="text-center py-2 text-xs text-slate-400 italic">No bills in this trip yet</div>
                             )}
                          </div>
                        )}
                     </div>
                   );
                 })}
               </div>
            )}

            {/* Uncategorized Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3 h-3" />
                {groups.length > 0 ? 'Uncategorized Bills' : 'All Bills'}
              </h3>
              
              {uncategorizedBills.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm italic">
                  No other bills found.
                </div>
              ) : (
                uncategorizedBills
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map(bill => (
                    <BillCard 
                      key={bill.id} 
                      bill={bill} 
                      onLoad={() => { onLoadBill(bill); onClose(); }} 
                      onDelete={onDeleteBill}
                      currentGroupId={null}
                      allGroups={groups}
                      onMove={onMoveBillToGroup}
                    />
                  ))
              )}
            </div>

          </div>
      </div>
    </>
  );
};

const BillCard: React.FC<{
  bill: SavedBill;
  onLoad: () => void;
  onDelete: (id: string) => void;
  currentGroupId: string | null;
  allGroups: Group[];
  onMove: (billId: string, groupId: string | null) => void;
}> = ({ bill, onLoad, onDelete, currentGroupId, allGroups, onMove }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group relative">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-slate-700 truncate pr-8 text-sm">{bill.name}</h3>
        
        {/* Actions Dropdown Trigger (simulated with hover group for simplicity) */}
        <div className="absolute top-2 right-2 flex items-center bg-white rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
           <button
            onClick={(e) => { e.stopPropagation(); onDelete(bill.id); }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-l-lg border-r border-slate-100"
            title="Delete"
           >
            <Trash2 className="w-3.5 h-3.5" />
           </button>
           
           {/* Move Dropdown */}
           <div className="relative group/move">
              <button className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-r-lg">
                <Folder className="w-3.5 h-3.5" />
              </button>
              {/* Dropdown Content */}
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 shadow-xl rounded-lg z-20 hidden group-hover/move:block">
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Move to...</div>
                    <button 
                       onClick={(e) => { e.stopPropagation(); onMove(bill.id, null); }}
                       className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${currentGroupId === null ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-600'}`}
                    >
                      Uncategorized
                    </button>
                    {allGroups.map(g => (
                      <button 
                        key={g.id}
                        onClick={(e) => { e.stopPropagation(); onMove(bill.id, g.id); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${currentGroupId === g.id ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-600'}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
              </div>
           </div>
        </div>
      </div>
      
      <div className="text-xs text-slate-500 mb-3 flex flex-col gap-0.5">
        <span>{new Date(bill.timestamp).toLocaleDateString()}</span>
        <span>{bill.receiptData.items.length} items • {bill.receiptData.currency || '$'}{((bill.receiptData.items.reduce((acc, i) => acc + i.price * i.quantity, 0)) + bill.receiptData.tax + bill.receiptData.tip).toFixed(2)}</span>
      </div>

      <button
        onClick={onLoad}
        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
      >
        Load Bill <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};
