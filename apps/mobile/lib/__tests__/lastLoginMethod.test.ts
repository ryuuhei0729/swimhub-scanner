import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadLastLoginMethod, saveLastLoginMethod } from "../lastLoginMethod";

describe("lastLoginMethod (mobile)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("未保存なら null を返す", async () => {
    await expect(loadLastLoginMethod()).resolves.toBeNull();
  });

  it("保存した手法を返す (後から保存したもので上書きされる)", async () => {
    await saveLastLoginMethod("email");
    await expect(loadLastLoginMethod()).resolves.toBe("email");
    await saveLastLoginMethod("apple");
    await expect(loadLastLoginMethod()).resolves.toBe("apple");
  });

  it("不正な値は無視する", async () => {
    await AsyncStorage.setItem("last-login-method", "github");
    await expect(loadLastLoginMethod()).resolves.toBeNull();
  });

  it("読み書きに失敗しても例外を投げない", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("io"));
    await expect(loadLastLoginMethod()).resolves.toBeNull();
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("io"));
    await expect(saveLastLoginMethod("google")).resolves.toBeUndefined();
  });
});
