// QA Phase B — scanner の apps/web/src/lib/client-ip.ts にはテストが1件も存在しなかった
// (swim-hub と同じ「テストが無いから誰も気づかなかった」状態)。担当A が swim-hub と同種の
// `??` フォールスルーバグを scanner 側でも発見・修正した後の契約検証。
//
// 注意: scanner の契約は swim-hub と異なる。**コピペしないこと。**
//   - 戻り値の型は `string` (null ではない)。全欠落時は "unknown" を返す
//     (呼び出し元 reserveGuestScan の引数型に波及するため、今回は null 化を見送っている)
//   - X-Real-IP は見ていない (scanner はそもそもこのヘッダーを信用しない設計)
//   - X-Forwarded-For の先頭要素が空の場合、2番目の要素にはフォールバックしない
//     (swim-hub と同じ設計判断: XFF は完全に偽装可能なヘッダーなので特別ルールを増やさない)
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/client-ip";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/scan-timesheet", {
    method: "POST",
    headers,
  });
}

describe("getClientIp (scanner) — モック無しの直接検証", () => {
  describe("優先順位: CF-Connecting-IP > X-Forwarded-For", () => {
    it("CF-Connecting-IP のみ → その値を返す", () => {
      const req = makeRequest({ "CF-Connecting-IP": "203.0.113.10" });
      expect(getClientIp(req)).toBe("203.0.113.10");
    });

    it("CF-Connecting-IP と X-Forwarded-For の両方がある場合、CF-Connecting-IP が優先される", () => {
      const req = makeRequest({
        "CF-Connecting-IP": "203.0.113.10",
        "X-Forwarded-For": "198.51.100.99, 10.0.0.1",
      });
      expect(getClientIp(req)).toBe("203.0.113.10");
    });

    it("CF-Connecting-IP が無く X-Forwarded-For のみ → X-Forwarded-For を使う", () => {
      const req = makeRequest({ "X-Forwarded-For": "198.51.100.20" });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });
  });

  describe("X-Forwarded-For の複数値処理 (カンマ区切り + trim)", () => {
    it("複数値の場合、先頭 (実クライアント側) を取る", () => {
      const req = makeRequest({ "X-Forwarded-For": "198.51.100.20, 10.0.0.1, 10.0.0.2" });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });

    it("先頭値の前後に空白があっても trim される", () => {
      const req = makeRequest({ "X-Forwarded-For": "  198.51.100.20  , 10.0.0.1" });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });

    it("カンマの直後にスペースが無くても正しく分割される", () => {
      const req = makeRequest({ "X-Forwarded-For": "198.51.100.20,10.0.0.1" });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });
  });

  describe("【修正されたバグの核心】CF-Connecting-IP が空/空白のみのとき X-Forwarded-For にフォールバックする", () => {
    it("CF-Connecting-IP が空文字の場合、X-Forwarded-For の値が使われる (修正前は空文字がそのまま返っていた)", () => {
      const req = makeRequest({
        "CF-Connecting-IP": "",
        "X-Forwarded-For": "198.51.100.20",
      });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });

    it("CF-Connecting-IP が空白のみの場合も、trim 後に空とみなされ X-Forwarded-For にフォールバックする", () => {
      const req = makeRequest({
        "CF-Connecting-IP": "   ",
        "X-Forwarded-For": "198.51.100.20",
      });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });

    it("CF-Connecting-IP の前後に空白がある正常値は trim されて返る (担当Aの追加分)", () => {
      const req = makeRequest({ "CF-Connecting-IP": "  203.0.113.10  " });
      expect(getClientIp(req)).toBe("203.0.113.10");
    });
  });

  describe("全欠落/空のとき \"unknown\" を返す (null ではない — scanner 固有の契約)", () => {
    it("CF-Connecting-IP も X-Forwarded-For も無い場合、\"unknown\" を返す", () => {
      const req = makeRequest({});
      expect(getClientIp(req)).toBe("unknown");
    });

    it("両方が空文字の場合も \"unknown\" を返す", () => {
      const req = makeRequest({ "CF-Connecting-IP": "", "X-Forwarded-For": "" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("両方が空白のみの場合も \"unknown\" を返す", () => {
      const req = makeRequest({ "CF-Connecting-IP": "   ", "X-Forwarded-For": "   " });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("無関係なヘッダーだけがある場合も \"unknown\" を返す (null ではないことを明示)", () => {
      const req = makeRequest({ "User-Agent": "QA-Test/1.0" });
      const result = getClientIp(req);
      expect(result).toBe("unknown");
      expect(result).not.toBeNull();
    });
  });

  describe("設計判断の記録: X-Forwarded-For 先頭要素が空でも2番目にはフォールバックしない (swim-hub と同じ判断)", () => {
    it("X-Forwarded-For が \",198.51.100.20\" (先頭要素が空) の場合、2番目を使わず \"unknown\" になる", () => {
      const req = makeRequest({ "X-Forwarded-For": ",198.51.100.20" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("X-Forwarded-For 先頭要素が空でも CF-Connecting-IP が有効ならそちらが優先される (fallback 順序自体は正しく機能する)", () => {
      const req = makeRequest({
        "CF-Connecting-IP": "203.0.113.10",
        "X-Forwarded-For": ",198.51.100.20",
      });
      expect(getClientIp(req)).toBe("203.0.113.10");
    });
  });

  describe("契約の明示: X-Real-IP は見ていない (scanner はこのヘッダーを信用しない)", () => {
    it("X-Real-IP のみを送っても無視され \"unknown\" になる (swim-hub との違い)", () => {
      const req = makeRequest({ "X-Real-IP": "192.0.2.55" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("CF-Connecting-IP と X-Forwarded-For が両方欠落し X-Real-IP だけがある場合でも、X-Real-IP には絶対にフォールバックしない", () => {
      const req = makeRequest({ "X-Real-IP": "192.0.2.55", "User-Agent": "attacker-controlled/1.0" });
      const result = getClientIp(req);
      expect(result).toBe("unknown");
      expect(result).not.toBe("192.0.2.55");
    });
  });

  describe("ヘッダー偽装・異常値", () => {
    it("IP 形式でない文字列がヘッダーに入っていても、バリデーションせずそのまま返す", () => {
      const req = makeRequest({ "X-Forwarded-For": "not-an-ip-address" });
      expect(getClientIp(req)).toBe("not-an-ip-address");
    });

    it("攻撃者がリテラルの文字列 \"unknown\" を CF-Connecting-IP に入れても、そのまま \"unknown\" として扱われる (共有バケットへの意図的な合流は可能だが、これは fail-closed 側であり quota 拡大には使えない — 詳細は QA レポート参照)", () => {
      const req = makeRequest({ "CF-Connecting-IP": "unknown" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("同名ヘッダーが複数回送られた場合 (Headers.append)、Fetch 標準に従いカンマ結合された1つの値として扱われる", () => {
      const headers = new Headers();
      headers.append("X-Forwarded-For", "198.51.100.20");
      headers.append("X-Forwarded-For", "10.0.0.1");
      const req = new NextRequest("http://localhost/api/scan-timesheet", { method: "POST", headers });
      expect(getClientIp(req)).toBe("198.51.100.20");
    });
  });
});
