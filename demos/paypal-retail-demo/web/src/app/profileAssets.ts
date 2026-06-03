export type StorefrontBrandMode = "popmart" | "generic";

export interface StorefrontProfileInput {
  readonly slug: string;
  readonly displayName: string;
  readonly brandMode: StorefrontBrandMode;
}

export interface ProfileAssetResolver {
  readonly assetBasePath: string;
  readonly logoText: string;
  readonly themeClassName: "theme-popmart" | "theme-generic";
  readonly resolveAssetPath: (assetPath: string) => string;
}

export function resolveProfileAssets(
  profile: StorefrontProfileInput,
): ProfileAssetResolver {
  const assetFolder = profile.brandMode === "generic" ? "generic" : "popmart";
  const assetBasePath = `/assets/${assetFolder}`;

  return {
    assetBasePath,
    logoText: profile.displayName,
    themeClassName:
      profile.brandMode === "generic" ? "theme-generic" : "theme-popmart",
    resolveAssetPath(assetPath) {
      return `${assetBasePath}/${assetPath.replace(/^\/+/, "")}`;
    },
  };
}
