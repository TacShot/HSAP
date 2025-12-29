
import { PortfolioItem } from '../types';

export const exportPortfolioToCSV = (portfolio: PortfolioItem[]): string => {
  const headers = ['Symbol', 'Quantity', 'Average Price'];
  const rows = portfolio.map(p => `${p.symbol},${p.quantity},${p.averagePrice}`);
  return [headers.join(','), ...rows].join('\n');
};

export const exportDataToJSON = (data: any): string => {
    return JSON.stringify(data, null, 2);
};

export const parseBrokerCSV = (csvContent: string, brokerType: 'GENERIC' | 'ZERODHA' | 'GROWW' | 'PAYTM'): PortfolioItem[] => {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const items: PortfolioItem[] = [];

    // Helper to find index loosely
    const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    let symIdx = -1, qtyIdx = -1, priceIdx = -1;

    // Detect columns based on Broker Type Strategy
    if (brokerType === 'ZERODHA') {
        // Zerodha (Kite) usually: Instrument, Qty, Avg. cost, LTP, Cur. val, P&L, Net chg
        symIdx = findIdx(['instrument', 'symbol']);
        qtyIdx = findIdx(['qty', 'quantity']);
        priceIdx = findIdx(['avg. cost', 'average price', 'buy avg']);
    } else if (brokerType === 'GROWW') {
        // Groww usually: Symbol, Company Name, Shares, Average Price, Current Price
        symIdx = findIdx(['symbol', 'stock name']);
        qtyIdx = findIdx(['shares', 'qty', 'quantity']);
        priceIdx = findIdx(['average price', 'avg price', 'buy price']);
    } else if (brokerType === 'PAYTM') {
        // Paytm Money: Symbol, Name, Quantity, Avg Price
        symIdx = findIdx(['symbol']);
        qtyIdx = findIdx(['quantity', 'qty']);
        priceIdx = findIdx(['avg price', 'average price']);
    } else {
        // Generic: Symbol, Qty, Price
        symIdx = findIdx(['symbol', 'ticker']);
        qtyIdx = findIdx(['qty', 'quantity', 'units']);
        priceIdx = findIdx(['price', 'avg', 'cost']);
    }

    if (symIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
        throw new Error("Could not detect required columns (Symbol, Qty, Price) in CSV.");
    }

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (row.length < 3) continue;

        let symbol = row[symIdx];
        const qty = parseFloat(row[qtyIdx]);
        const price = parseFloat(row[priceIdx]);

        if (!symbol || isNaN(qty) || isNaN(price)) continue;

        // Normalization for Indian Markets
        if (!symbol.includes('.')) {
            // Assume NSE if no suffix
            symbol = symbol.toUpperCase() + '.NS';
        }

        items.push({
            symbol: symbol.toUpperCase(),
            quantity: qty,
            averagePrice: price
        });
    }

    return items;
};
