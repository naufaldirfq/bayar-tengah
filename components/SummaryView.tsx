
import React, { useMemo, useState } from 'react';
import { PersonSummary, SavedBill } from '../types';
import { DollarSign, PieChart, Share2, Save, Check, X, LayoutGrid } from 'lucide-react';

interface SummaryViewProps {
  bills: SavedBill[];
  onSave?: () => void;
  onClose?: () => void;
  isGroupView?: boolean;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ bills, onSave, onClose, isGroupView = false }) => {
  const [copied, setCopied] = useState(false);

  const summary = useMemo<PersonSummary[]>(() => {
    if (bills.length === 0) return [];

    const peopleMap = new Map<string, PersonSummary>();

    bills.forEach(bill => {
       const { receiptData, assignments, name: billName } = bill;
       const subtotal = receiptData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
       
       if (subtotal === 0) return;

       // Iterate items in this bill
       receiptData.items.forEach((item, index) => {
         // Assignments can be assignments object from multiple bills. 
         // Assuming 'assignments' passed here is correct for the 'receiptData'.
         // Since 'SavedBill' couples them, it's safe.
         const assignedTo: Record<string, number> = assignments[index] || {};
         const people = Object.keys(assignedTo);
         const totalAssignedQuantity = Object.values(assignedTo).reduce((a, b) => a + b, 0);

         if (totalAssignedQuantity > 0) {
           people.forEach(person => {
             const personQuantity = assignedTo[person];
             // Share of cost for this item
             const costShare = (item.price * item.quantity) * (personQuantity / totalAssignedQuantity);

             const current = peopleMap.get(person) || { 
               name: person, 
               subtotal: 0, 
               tax: 0, 
               tip: 0, 
               total: 0,
               items: []
             };

             current.subtotal += costShare;

             // Calculate proportional tax/tip for this specific item/person share within THIS bill
             // Bill Tax Rate = bill.tax / bill.subtotal
             const billSubtotal = subtotal;
             const taxShare = (receiptData.tax / billSubtotal) * costShare;
             const tipShare = (receiptData.tip / billSubtotal) * costShare;

             current.tax += isNaN(taxShare) ? 0 : taxShare;
             current.tip += isNaN(tipShare) ? 0 : tipShare;

             // Format Item Label
             let itemLabel = item.name;
             if (personQuantity > 1) {
                itemLabel = `${personQuantity}x ${itemLabel}`;
                if (totalAssignedQuantity > personQuantity) {
                  itemLabel = `${itemLabel} (split ${personQuantity}/${totalAssignedQuantity})`;
                }
             } else if (totalAssignedQuantity > 1) {
                itemLabel = `${itemLabel} (split 1/${totalAssignedQuantity})`;
             }

             // Append Bill Name if summarizing multiple bills
             if (isGroupView) {
               itemLabel = `${itemLabel} [${billName}]`;
             }

             current.items.push(itemLabel);
             peopleMap.set(person, current);
           });
         }
       });
    });

    // Final total calculation
    const people = Array.from(peopleMap.values());
    people.forEach(person => {
      person.total = person.subtotal + person.tax + person.tip;
    });

    return people.sort((a, b) => b.total - a.total);
  }, [bills, isGroupView]);

  const handleShare = async () => {
    if (bills.length === 0) return;
    
    // Naive currency handling: take first bill's currency
    const currency = bills[0].receiptData.currency || '$';
    
    // Calculate total across all bills
    const totalAllBills = bills.reduce((sum, bill) => {
       const billTotal = bill.receiptData.items.reduce((acc, i) => acc + i.price * i.quantity, 0) + bill.receiptData.tax + bill.receiptData.tip;
       return sum + billTotal;
    }, 0);
    
    let text = isGroupView ? `✈️ Trip Summary (${bills.length} Bills)\n\n` : `🧾 Bill Split Summary\n\n`;
    
    if (summary.length > 0) {
      summary.forEach(p => {
        text += `${p.name}: ${currency}${p.total.toFixed(2)}\n`;
        p.items.forEach(item => {
           text += `  • ${item}\n`;
        });
        text += `   (Items: ${p.subtotal.toFixed(2)}, Tax/Tip: ${(p.tax + p.tip).toFixed(2)})\n\n`;
      });
    } else {
      text += `No assignments made yet.\n`;
    }
    
    text += `-------------------\n`;
    text += `Grand Total: ${currency}${totalAllBills.toFixed(2)}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (bills.length === 0) return null;

  // Use the first bill's currency for display
  const displayCurrency = bills[0].receiptData.currency || '$';

  return (
    <div className="h-full bg-slate-900 text-slate-100 flex flex-col">
      <div className="p-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-emerald-400">
            {isGroupView ? <LayoutGrid className="w-6 h-6" /> : <PieChart className="w-6 h-6" />}
            <h2 className="text-lg font-bold tracking-wide uppercase">
              {isGroupView ? 'Trip Summary' : 'Live Breakdown'}
            </h2>
          </div>
          <div className="flex gap-2">
             {onSave && (
               <button 
                onClick={onSave}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Save to History"
               >
                 <Save className="w-5 h-5" />
               </button>
             )}
             <button 
              onClick={handleShare}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors relative"
              title="Copy Summary"
             >
               {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
             </button>
             {onClose && (
               <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Close"
               >
                 <X className="w-6 h-6" />
               </button>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {summary.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-8 italic border border-slate-800 rounded-lg">
            No items assigned yet
          </div>
        ) : (
          summary.map((person) => (
            <div key={person.name} className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="font-bold text-lg text-white">{person.name}</h3>
                <span className="text-2xl font-bold text-emerald-400">
                  {displayCurrency}{person.total.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{person.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-75">
                   <span>+ Tax & Tip</span>
                   <span>{(person.tax + person.tip).toFixed(2)}</span>
                </div>
              </div>
              
              {/* Items List Preview */}
              {person.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Items</p>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {person.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                         <span className="text-slate-600 mt-0.5">•</span>
                         <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}

        {/* Unassigned Warning (Only for single bill view mostly, simpler to hide for trips to avoid noise) */}
        {!isGroupView && (() => {
           const assignedSubtotal = summary.reduce((acc, p) => acc + p.subtotal, 0);
           const totalSubtotal = bills.reduce((sum, b) => sum + b.receiptData.items.reduce((acc, i) => acc + i.price * i.quantity, 0), 0);
           const unassigned = totalSubtotal - assignedSubtotal;
           
           if (unassigned > 0.01) {
             return (
               <div className="mt-6 p-3 bg-amber-900/30 border border-amber-900/50 rounded-lg flex items-start gap-3">
                 <div className="bg-amber-500/20 p-1.5 rounded-full shrink-0">
                   <DollarSign className="w-4 h-4 text-amber-500" />
                 </div>
                 <div>
                   <p className="text-amber-200 text-sm font-medium">Unassigned Amount</p>
                   <p className="text-amber-500 font-bold">{displayCurrency}{unassigned.toFixed(2)}</p>
                 </div>
               </div>
             )
           }
           return null;
        })()}
      </div>
    </div>
  );
};
