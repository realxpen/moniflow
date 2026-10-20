type InitializeOptions = {
  pinLength: number;
  requirePin: boolean;
};

const waydroidUiPreview = process.env.EXPO_PUBLIC_MONIFLOW_WAYDROID_PREVIEW === "1";

function nativeSdk() {
  // The excluded native package must never even be required on Waydroid.
  if (waydroidUiPreview) {
    throw new Error("BMONI wallet and signing are unavailable in the Waydroid x86_64 UI preview. Use a physical ARM64 Android phone.");
  }
  // Lazy loading preserves the normal physical-device behavior, while preventing
  // module initialization in the UI-only variant.
  return (require("@bkey-inc/bmoni_embedded_sdk") as typeof import("@bkey-inc/bmoni_embedded_sdk")).BmoniEmbeddedSdk;
}

export const bmoniDevice = {
  available: !waydroidUiPreview,
  initialize(options: InitializeOptions) {
    if (!waydroidUiPreview) nativeSdk().initialize(options);
  },
  hasWallet() {
    return nativeSdk().hasWallet();
  },
  walletAddress() {
    return nativeSdk().walletAddress();
  },
  initWallet() {
    return nativeSdk().initWallet();
  },
  hasPin() {
    return nativeSdk().hasPin();
  },
  matchPin(pin: string) {
    return nativeSdk().matchPin(pin);
  },
  setPin(pin: string) {
    return nativeSdk().setPin(pin);
  },
  signMessage(message: string, pin: string) {
    return nativeSdk().signMessage(message, pin);
  },
  signTransactionHash(hashHex: string, pin: string) {
    return nativeSdk().signTransactionHash(hashHex, pin);
  }
};
