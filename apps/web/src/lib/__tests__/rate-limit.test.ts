// QA Phase B — 補足検証 (PM 指示): "unknown" が reserveGuestScan() に渡ったときに
// 何が起きるかを実測する。担当A の「fail-closed であり悪用経路ではない」という判断の
// 裏を取るための最小限のテスト。
//
// トートロジー回避: hashIp() はモックせず実際に Web Crypto (crypto.subtle) で
// ハッシュ化させ、RPC へ渡される実際の引数を検査する (swim-hub の rate-limit.test.ts
// V8 と同型)。reserveGuestScan/rollbackGuestScanCount 自体は export されているので
// 実装を直接呼ぶ。
//
// 事前調査 (静的レビュー、swim-hub の同型 RPC から): reserve_guest_scan は
// `(ip_hash, usage_date)` を主キーとする単一テーブル行に対して
// `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < v_limit (=1)` を実行する。
// これは「ip_hash ごとに1日1回」を保証する原子的カウンタであり、ip_hash の
// *値そのもの* が何であるかとは無関係にセマンティクスが変わらない
// (固定文字列 "unknown" のハッシュであっても、ランダムな IP のハッシュであっても、
// 「そのキーは1日1回まで」という同じ制約が適用されるだけ)。
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const rpcMock = vi.fn();
const singleMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: (...args: unknown[]) => {
      rpcMock(...args);
      return { single: () => singleMock() };
    },
  })),
}));

import { reserveGuestScan } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  singleMock.mockResolvedValue({ data: { allowed: true, remaining: 0 }, error: null });
});

describe("reserveGuestScan(\"unknown\") — \"unknown\" 共有バケットの評価", () => {
  it("「unknown」という文字列も他の IP と全く同じように SHA-256 ハッシュ化されてから RPC に渡る (特別扱いされていない)", async () => {
    await reserveGuestScan("unknown");

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = rpcMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(rpcName).toBe("reserve_guest_scan");
    expect(rpcArgs.p_ip_hash).toMatch(/^[0-9a-f]{64}$/);
    // 生の "unknown" という文字列がそのまま RPC に渡っていない (ハッシュ化されている)
    expect(rpcArgs.p_ip_hash).not.toBe("unknown");
  });

  it("【核心】\"unknown\" は常に同じハッシュ値になる (= 全世界の IP 不明ゲストが同じ1バケットを共有する)", async () => {
    await reserveGuestScan("unknown");
    const hash1 = (rpcMock.mock.calls[0]![1] as { p_ip_hash: string }).p_ip_hash;

    rpcMock.mockClear();
    await reserveGuestScan("unknown");
    const hash2 = (rpcMock.mock.calls[0]![1] as { p_ip_hash: string }).p_ip_hash;

    expect(hash1).toBe(hash2);
  });

  it("\"unknown\" のハッシュは、実在する IP アドレス文字列のハッシュとは異なる (無関係な IP のバケットを汚染しない)", async () => {
    await reserveGuestScan("unknown");
    const unknownHash = (rpcMock.mock.calls[0]![1] as { p_ip_hash: string }).p_ip_hash;

    rpcMock.mockClear();
    await reserveGuestScan("203.0.113.10");
    const realIpHash = (rpcMock.mock.calls[0]![1] as { p_ip_hash: string }).p_ip_hash;

    expect(unknownHash).not.toBe(realIpHash);
  });

  it("RPC が allowed:false (\"unknown\" バケットが既に本日分を使い切っている) を返した場合、そのまま false が伝播する (= バイパスできない)", async () => {
    singleMock.mockResolvedValue({ data: { allowed: false, remaining: 0 }, error: null });
    const result = await reserveGuestScan("unknown");
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("RPC が allowed:true を返す1回目の \"unknown\" 呼び出しは通る (v_limit=1 の枠を消費する)", async () => {
    singleMock.mockResolvedValue({ data: { allowed: true, remaining: 0 }, error: null });
    const result = await reserveGuestScan("unknown");
    expect(result).toEqual({ allowed: true, remaining: 0 });
  });
});
