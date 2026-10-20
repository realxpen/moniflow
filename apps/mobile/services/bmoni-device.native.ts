/**
 * Waydroid x86_64 UI/API preview only.
 * BMONI's Android signer does not ship an x86_64 binary.
 * Never simulate a wallet, PIN check or signature.
 */
type InitializeOptions = { pinLength: number; requirePin: boolean };

const unavailable = async <T>(): Promise<T> => {
  throw new Error("BMONI device wallet and signing are unavailable in the Waydroid x86_64 UI preview. Use a physical ARM64 Android phone.");
};

export const bmoniDevice = {
  available: false,
  initialize(_options: InitializeOptions) {},
  hasWallet: (): Promise<boolean> => unavailable<boolean>(),
  walletAddress: (): Promise<string> => unavailable<string>(),
  initWallet: (): Promise<string> => unavailable<string>(),
  hasPin: (): Promise<boolean> => unavailable<boolean>(),
  matchPin: (_pin: string): Promise<boolean> => unavailable<boolean>(),
  setPin: (_pin: string): Promise<void> => unavailable<void>(),
  signMessage: (_message: string, _pin: string): Promise<string> => unavailable<string>(),
  signTransactionHash: (_hashHex: string, _pin: string): Promise<string> => unavailable<string>()
};
