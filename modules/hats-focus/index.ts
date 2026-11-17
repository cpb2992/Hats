import { requireOptionalNativeModule } from "expo-modules-core";
interface FocusModule {
  consumeSharedText(): Promise<string | null>;
  configure(until: number, packages: string[]): Promise<void>;
  isEnabled(): boolean;
  openSettings(): Promise<void>;
}
export default requireOptionalNativeModule<FocusModule>("HatsFocus");
