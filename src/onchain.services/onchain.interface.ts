

/**
 * Represents the price information for ETH and rswETH, including their individual prices and the exchange rate between them.
 *
 * @property {number} ETHPrice - The current price of ETH.
 * @property {number} rswETHPrice - The current price of rswETH.
 * @property {number} exchangeRate - The exchange rate between ETH and rswETH.
 */
export interface ETHAndRSWETHPrice {
    ETHPrice: number;
    rswETHPrice: number;
    exchangeRate: number;
}

/**
 * Represents a message indicating the success or failure of an operation.
 *
 * @property success - An optional string describing a successful outcome.
 * @property error - An optional string describing an error or failure.
 */
export interface SuccessMessage {
    success?: string;
    error?: string;
}