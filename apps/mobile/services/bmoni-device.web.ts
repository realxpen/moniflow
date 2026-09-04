type InitializeOptions = {
  pinLength: number;
  requirePin: boolean;
};

const unsupported = async (): Promise<never> => {
  throw new Error("BMONI device signing requires the iOS or Android development build.");
};

export const bmoniDevice = {
  available: false,
  initialize(_options: InitializeOptions) {},
  walletAddress: unsupported,
  initWallet: unsupported,
  hasPin: unsupported,
  setPin: async (_pin: string) => unsupported(),
  signMessage: async (_message: string, _pin: string) => unsupported()
};
