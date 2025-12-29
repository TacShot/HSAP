import { Stock } from '../types';

export const parseCommand = (input: string) => {
  const parts = input.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).map(a => a.toUpperCase());

  return { command, args };
};

export const formatStockTable = (stocks: Stock[]): string[] => {
  const header = "SYMBOL          PRICE       CHANGE     %CHG     VOL";
  const separator = "-------------------------------------------------------";
  
  const rows = stocks.map(s => {
    const sym = s.symbol.padEnd(15);
    const price = s.price.toFixed(2).padStart(10);
    const chg = (s.change >= 0 ? '+' : '') + s.change.toFixed(2);
    const chgPad = chg.padStart(10);
    const pchg = (s.percentChange >= 0 ? '+' : '') + s.percentChange.toFixed(2) + '%';
    const pchgPad = pchg.padStart(8);
    const vol = (s.volume / 1000).toFixed(1) + 'K';
    const volPad = vol.padStart(8);
    
    return `${sym}${price}${chgPad}${pchgPad}${volPad}`;
  });

  return [header, separator, ...rows];
};
