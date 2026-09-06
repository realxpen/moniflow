type InitializeOptions = {
  pinLength: number;
  requirePin: boolean;
};

const unsupported = async <T>(): Promise<T> => {
  throw new Error("BMONI device signing requires the iOS or Android development build.");
};

export const bmoniDevice = {
  available: false,
  initialize(_options: InitializeOptions) {},
  hasWallet: (): Promise<boolean> => unsupported<boolean>(),
  walletAddress: (): Promise<string> => unsupported<string>(),
  initWallet: (): Promise<string> => unsupported<string>(),
  hasPin: (): Promise<boolean> => unsupported<boolean>(),
  matchPin: async (_pin: string): Promise<boolean> => unsupported<boolean>(),
  setPin: async (_pin: string): Promise<void> => unsupported<void>(),
  signMessage: async (_message: string, _pin: string): Promise<string> => unsupported<string>(),
  signTransactionHash: async (_hashHex: string, _pin: string): Promise<string> => unsupported<string>()
};
