import { ENV } from "./env";

export class ForgeFeatureDisabledError extends Error {
  constructor(featureLabel?: string) {
    const label = featureLabel?.trim() || "Forge API features";
    super(`${label} are disabled`);
    this.name = "ForgeFeatureDisabledError";
  }
}

export const isForgeEnabled = (): boolean => ENV.forgeFeaturesEnabled;

export const assertForgeEnabled = (featureLabel?: string): void => {
  if (!isForgeEnabled()) {
    throw new ForgeFeatureDisabledError(featureLabel);
  }
};
