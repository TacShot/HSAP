import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0c0c0c] border border-gray-600 p-8 w-[650px] shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 bg-gray-600 text-black px-3 py-1 text-sm font-bold">
          HELP
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
          <div>
            <h3 className="text-green-400 mb-2 border-b border-gray-800 pb-1">Dashboard Controls</h3>
            <div className="flex justify-between py-1"><span>↑ / k</span> <span className="text-gray-500">Move Selection Up</span></div>
            <div className="flex justify-between py-1"><span>↓ / j</span> <span className="text-gray-500">Move Selection Down</span></div>
            <div className="flex justify-between py-1"><span>a</span> <span className="text-gray-500">Add Stock</span></div>
            <div className="flex justify-between py-1"><span>d</span> <span className="text-gray-500">Remove Stock</span></div>
            <div className="flex justify-between py-1"><span>r</span> <span className="text-gray-500">Set Price Alert</span></div>
            <div className="flex justify-between py-1"><span>p</span> <span className="text-gray-500">Predict Price (AI)</span></div>
          </div>

          <div>
             <h3 className="text-purple-400 mb-2 border-b border-gray-800 pb-1">Global Navigation</h3>
             <div className="flex justify-between py-1"><span>Alt + 1</span> <span className="text-gray-500">Dashboard</span></div>
             <div className="flex justify-between py-1"><span>Alt + 2</span> <span className="text-gray-500">Portfolio</span></div>
             <div className="flex justify-between py-1"><span>Alt + 3</span> <span className="text-gray-500">AI Analyst</span></div>
             <div className="flex justify-between py-1"><span>Alt + 4</span> <span className="text-gray-500">Opportunities</span></div>
             <div className="flex justify-between py-1"><span>Alt + 5</span> <span className="text-gray-500">Screener</span></div>
             <div className="flex justify-between py-1"><span>[ / ]</span> <span className="text-gray-500">Cycle Pages</span></div>
          </div>

          <div className="col-span-2 mt-2">
            <h3 className="text-yellow-400 mb-2 border-b border-gray-800 pb-1">Timeframes (Dashboard)</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex justify-between"><span>1</span> <span className="text-gray-500">Intraday</span></div>
              <div className="flex justify-between"><span>2</span> <span className="text-gray-500">1 Week</span></div>
              <div className="flex justify-between"><span>3</span> <span className="text-gray-500">1 Month</span></div>
              <div className="flex justify-between"><span>4</span> <span className="text-gray-500">3 Months</span></div>
              <div className="flex justify-between"><span>5</span> <span className="text-gray-500">6 Months</span></div>
              <div className="flex justify-between"><span>6</span> <span className="text-gray-500">1 Year</span></div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs border-t border-gray-800 pt-4">
          Press [h] again or Click outside to close
        </div>
      </div>
    </div>
  );
};
