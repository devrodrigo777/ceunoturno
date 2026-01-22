export const generateFictionalCoordinate = () => {
    const h = Math.floor(Math.random() * 24);
    const m = Math.floor(Math.random() * 60);
    const d = Math.floor(Math.random() * 180 - 90);
    return `RA ${h}h ${m}m / DEC ${d > 0 ? '+' : ''}${d}°`;
};

export const calculateFrontendPrice = (quote : any, type: string) => {
    if (!quote) return 0;

    return quote.base_price + quote.type_prices[type];
}