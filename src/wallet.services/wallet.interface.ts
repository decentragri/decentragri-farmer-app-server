  /**
   * Represents data related to a user's wallet.
   *
   * @interface WalletData
   * @property {string} smartWalletAddress - The address of the smart wallet.
   * @property {string} beatsBalance - The balance in beats.
   * @property {string} gmrBalance - The balance in kmr.
   * @property {string} nativeBalance - The native balance.
   * @property {string} ethBalance - The balance in ETH.
   * @property {string} swellBalance - The balance in SWELL.
   * @property {number} dagriPriceUSD - The price of DAGRI in USD.
   * @property {number} ethPriceUSD - The price of ETH in USD.
   * @property {number} swellPriceUSD - The price of SWELL in USD.
   * @property {number} dagriPriceUSD - The price of DAGRI in USD.
   * 
   * 
   */
  export interface WalletData {
    smartWalletAddress: string;

    // Balances
    dagriBalance: string;
    rsWETHBalance: string;
    ethBalance: string;
    swellBalance: string;
    nativeBalance: string;

    // Prices in USD
    dagriPriceUSD: number;
    ethPriceUSD: number;
    swellPriceUSD: number;
  }
