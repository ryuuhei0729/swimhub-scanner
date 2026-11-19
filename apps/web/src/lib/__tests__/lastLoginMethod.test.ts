import { afterEach, describe, expect, it } from "vitest";
import {
  buildLastLoginMethodCookie,
  getLastLoginMethod,
  LAST_LOGIN_METHOD_COOKIE,
  setLastLoginMethod,
} from "@/lib/lastLoginMethod";

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

describe("lastLoginMethod", () => {
  afterEach(() => {
    clearCookies();
  });

  it("未保存なら null を返す", () => {
    expect(getLastLoginMethod()).toBeNull();
  });

  it("保存した手法を返す (後から保存したもので上書きされる)", () => {
    setLastLoginMethod("email");
    expect(getLastLoginMethod()).toBe("email");
    setLastLoginMethod("google");
    expect(getLastLoginMethod()).toBe("google");
  });

  it("localStorage / sessionStorage を消しても記録は残る", () => {
    setLastLoginMethod("apple");
    window.localStorage.clear();
    window.sessionStorage.clear();
    expect(getLastLoginMethod()).toBe("apple");
  });

  it("不正な値の Cookie は無視する", () => {
    document.cookie = `${LAST_LOGIN_METHOD_COOKIE}=github; Path=/`;
    expect(getLastLoginMethod()).toBeNull();
  });

  it("Cookie は 1 年・SameSite=Lax・httpOnly なしで、https のときだけ Secure を付ける", () => {
    expect(buildLastLoginMethodCookie("google", false)).toBe(
      "swimhub_last_login_method=google; Path=/; Max-Age=31536000; SameSite=Lax",
    );
    expect(buildLastLoginMethodCookie("google", true)).toBe(
      "swimhub_last_login_method=google; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
    );
  });
});
