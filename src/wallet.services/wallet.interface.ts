  /**
   * Represents data related to a user's wallet.
   *
   * @interface WalletData
   * @property {string} smartWalletAddress - The address of the smart wallet.
   * @property {string} beatsBalance - The balance in beats.
   * @property {string} gmrBalance - The balance in kmr.
   * @property {string} nativeBalance - The native balance.
   */
  export interface WalletData {
    smartWalletAddress: string;
    dagriBalance: string;
    rsWETHBalance: string;

    nativeBalance: string;
  }