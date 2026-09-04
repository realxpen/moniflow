import { BmoniEmbeddedSdk } from "@bkey-inc/bmoni_embedded_sdk";

type InitializeOptions = {
  pinLength: number;
  requirePin: boolean;
};

export const bmoniDevice = {
  available: true,
  initialize(options: InitializeOptions) {
    BmoniEmbeddedSdk.initialize(options);
  },
  walletAddress() {
    return BmoniEmbeddedSdk.walletAddress();
  },
  initWallet() {
    return BmoniEmbeddedSdk.initWallet();
  },
  hasPin() {
    return BmoniEmbeddedSdk.hasPin();
  },
  setPin(pin: string) {
    return BmoniEmbeddedSdk.setPin(pin);
  },
  signMessage(message: string, pin: string) {
    return BmoniEmbeddedSdk.signMessage(message, pin);
  },
  signTransactionHash(hashHex: string, pin: string) {
    return BmoniEmbeddedSdk.signTransactionHash(hashHex, pin);
  }
};
