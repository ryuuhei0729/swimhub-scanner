// Google Publisher Tag (GPT) Rewarded Ad Controller for Web
//
// Prerequisites:
//   1. Google Ad Manager account (free): https://admanager.google.com/
//   2. Link your AdSense account to Ad Manager
//   3. Create a "Rewarded" ad unit and get the ad unit path
//   4. Replace the AD_UNIT_PATH below with your actual path

// TODO: Replace with your Google Ad Manager network ID and ad unit path
// Format: "/network-id/ad-unit-name"
const AD_UNIT_PATH = "/your-network-id/scanner-rewarded-ad-unit";

export type AdState =
  | "idle"
  | "loading"
  | "loaded"
  | "showing"
  | "rewarded"
  | "error";

export interface RewardedAdController {
  load: () => void;
  show: () => void;
  getState: () => AdState;
  onStateChange: (callback: (state: AdState) => void) => () => void;
  dispose: () => void;
}

interface GptSlot {
  addService(service: GptPubAdsService): GptSlot;
}

interface GptPubAdsService {
  addEventListener(
    eventType: string,
    listener: (event: GptRewardedEvent) => void
  ): GptPubAdsService;
  removeEventListener(
    eventType: string,
    listener: (event: GptRewardedEvent) => void
  ): void;
}

interface GptRewardedEvent {
  slot: GptSlot;
  makeRewardedVisible?: () => void;
}

interface Googletag {
  cmd: Array<() => void>;
  defineOutOfPageSlot(adUnitPath: string, format: number): GptSlot | null;
  enableServices(): void;
  display(slot: GptSlot): void;
  destroySlots(slots?: GptSlot[]): boolean;
  pubads(): GptPubAdsService;
  enums: {
    OutOfPageFormat: {
      REWARDED: number;
    };
  };
}

declare global {
  interface Window {
    googletag?: Googletag;
  }
}

let gptServicesEnabled = false;

export function createRewardedAdController(): RewardedAdController | null {
  if (typeof window === "undefined" || !window.googletag) {
    return null;
  }

  let state: AdState = "idle";
  let listeners: Array<(state: AdState) => void> = [];
  let slot: GptSlot | null = null;
  let rewardedVisible: (() => void) | null = null;

  function setState(newState: AdState) {
    state = newState;
    listeners.forEach((cb) => cb(newState));
  }

  const onReady = (event: GptRewardedEvent) => {
    if (event.slot !== slot) return;
    rewardedVisible = event.makeRewardedVisible ?? null;
    setState("loaded");
  };

  const onGranted = (event: GptRewardedEvent) => {
    if (event.slot !== slot) return;
    setState("rewarded");
  };

  const onClosed = (event: GptRewardedEvent) => {
    if (event.slot !== slot) return;
    if (state !== "rewarded") {
      setState("error");
    }
  };

  return {
    load() {
      if (state === "loading" || state === "loaded") return;

      setState("loading");

      window.googletag!.cmd.push(() => {
        const gt = window.googletag!;

        slot = gt.defineOutOfPageSlot(
          AD_UNIT_PATH,
          gt.enums.OutOfPageFormat.REWARDED
        );

        if (!slot) {
          setState("error");
          return;
        }

        slot.addService(gt.pubads());

        gt.pubads().addEventListener("rewardedSlotReady", onReady);
        gt.pubads().addEventListener("rewardedSlotGranted", onGranted);
        gt.pubads().addEventListener("rewardedSlotClosed", onClosed);

        if (!gptServicesEnabled) {
          gt.enableServices();
          gptServicesEnabled = true;
        }
        gt.display(slot);
      });
    },

    show() {
      if (state !== "loaded" || !slot || !rewardedVisible) return;

      setState("showing");
      rewardedVisible();
      rewardedVisible = null;
    },

    getState() {
      return state;
    },

    onStateChange(callback) {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((cb) => cb !== callback);
      };
    },

    dispose() {
      if (slot && window.googletag) {
        window.googletag.cmd.push(() => {
          const gt = window.googletag!;
          gt.pubads().removeEventListener("rewardedSlotReady", onReady);
          gt.pubads().removeEventListener("rewardedSlotGranted", onGranted);
          gt.pubads().removeEventListener("rewardedSlotClosed", onClosed);
          if (slot) gt.destroySlots([slot]);
          slot = null;
          rewardedVisible = null;
        });
      }
      listeners = [];
      state = "idle";
    },
  };
}
