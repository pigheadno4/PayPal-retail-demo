export interface WorkspaceInfo {
  readonly name: string;
  readonly profileCount: number;
  readonly usesTypeScript: true;
}

export const workspaceInfo: WorkspaceInfo = {
  name: "paypal-retail-demo",
  profileCount: 2,
  usesTypeScript: true,
};
