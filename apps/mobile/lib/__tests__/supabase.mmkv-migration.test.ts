/**
 * QA Phase B — Sprint Contract V25/V26/V27 (M-3: mobile refresh token 暗号化 + 移行)
 *
 * 人間の判断の核心: 「既存ログインユーザーを強制ログアウトさせない」移行ロジックを検証する。
 *
 * トートロジー回避方針: lib/supabase.ts の移行関数 (migrateLegacySessionOnce 等) は
 * export されていないため、実装を再実装したり内部関数を直接呼んだりしない。公開されている
 * 唯一のエントリポイント (`supabase.auth.getSession()` / `clearMmkvCaches()`) を通して
 * ユーザーに意味のある性質 (セッションが失われない/クラッシュしない) だけを検証する。
 *
 * 実行環境について: mobile アプリは Jest (jest-expo preset) を使用する。
 * Vitest では `require("react-native-mmkv")` 等が esbuild/vite-node の require() 処理の
 * 都合で常に失敗し (Node の裸の require ではこれらの RN 専用パッケージが構造的に解決
 * できないため)、暗号化 MMKV への実際の移行分岐に到達できないことを swim-hub 側の
 * 調査で確認済み (swim-hub/apps/mobile/lib/__tests__/supabase.mmkv-migration.test.ts の
 * コメント参照)。Jest は `jest.mock()` が Node の Module._load 自体をフックするため
 * require() 経路でも正しく差し替えが効く。scanner はこちらの前提で書く。
 */

const mockAsyncStorageMap = new Map<string, string>();
const mockMmkvRegistry = new Map<string, Map<string, string>>();
let mockMmkvUnavailable = false;
// W-2 再検証用: 指定したキーへの mmkv.set() だけを失敗させる (それ以外のキー、
// 例えば移行済みフラグ/リトライ回数カウンタへの書き込みは正常に動作させたい)。
let mockMmkvSetThrowForKey: string | null = null;
// Reviewer 指摘 (再検証項目2) 用: expo-secure-store を使えない環境 (SecureStore
// unavailable, 実機では「対応していないAndroid端末」等) を再現するフラグ。
// getItem/setItem の両方をそれぞれ独立に落とせるようにする (getAuthEncryptionKey
// の「既存鍵読み取り失敗」と「新規鍵書き込み失敗」を区別して検証するため)。
let mockSecureStoreGetItemShouldThrow = false;
let mockSecureStoreSetItemShouldThrow = false;
// Reviewer 指摘: createMMKV が id/encryptionKey の有無に関わらず同じ挙動 (プレーンな
// Map) を返すため、従来のモックは「暗号化されているかどうか」を一切区別できなかった。
// createMMKV への実際の呼び出し引数 (id と encryptionKey の有無) を記録し、
// テストからどちらの id/鍵で呼ばれたかを検証できるようにする。
const mockCreateMMKVCalls: { id: string; encryptionKey: string | undefined }[] = [];

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getAllKeys: jest.fn(async () => Array.from(mockAsyncStorageMap.keys())),
    getItem: jest.fn(async (key: string) => mockAsyncStorageMap.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorageMap.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockAsyncStorageMap.delete(key);
    }),
  },
}));

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => {
      if (mockSecureStoreGetItemShouldThrow) {
        throw new Error("SecureStore.getItem failed (simulated: Keychain/Keystore unavailable)");
      }
      return store.get(key) ?? null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (mockSecureStoreSetItemShouldThrow) {
        throw new Error("SecureStore.setItem failed (simulated: Keychain/Keystore unavailable)");
      }
      store.set(key, value);
    }),
  };
});

jest.mock("expo-crypto", () => ({
  getRandomBytes: jest.fn((length: number) => {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) bytes[i] = (i * 7 + 1) % 256;
    return bytes;
  }),
}));

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn((config: { id: string; encryptionKey?: string }) => {
    mockCreateMMKVCalls.push({ id: config.id, encryptionKey: config.encryptionKey });
    if (mockMmkvUnavailable) {
      throw new Error("NitroModules: NitroMmkv could not be found");
    }
    if (!mockMmkvRegistry.has(config.id)) {
      mockMmkvRegistry.set(config.id, new Map());
    }
    const store = mockMmkvRegistry.get(config.id) as Map<string, string>;
    return {
      getString: (key: string) => store.get(key),
      set: (key: string, value: string) => {
        if (mockMmkvSetThrowForKey !== null && key === mockMmkvSetThrowForKey) {
          throw new Error(`mmkv.set() failed for key "${key}" (simulated disk full / MMKV error)`);
        }
        store.set(key, String(value));
      },
      remove: (key: string) => {
        store.delete(key);
      },
      clearAll: () => {
        store.clear();
      },
    };
  }),
}));

const LEGACY_KEY = "sb-testref-auth-token";
const ENCRYPTED_STORE_ID = "supabase-auth-enc";
// SecureStore が使えない場合に createMmkvStorage() がフォールバックする非暗号 id
// (lib/supabase.ts の AUTH_STORE_ID とは別の、暗号化しない既定 MMKV インスタンス)。
const PLAINTEXT_STORE_ID = "supabase-auth";
const MIGRATION_FLAG_KEY = "async-storage-migration-v1-done";
const MIGRATION_ATTEMPTS_KEY = "async-storage-migration-v1-attempts";
const MAX_MIGRATION_ATTEMPTS = 5; // 実装 (lib/supabase.ts) の MAX_MIGRATION_ATTEMPTS と同値

function makeFakeSessionJson(): string {
  const nowSec = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
    expires_at: nowSec + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "11111111-1111-4111-a111-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: "qa-migration@example.test",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  });
}

function importSupabaseModuleFresh() {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://testref.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  return require("@/lib/supabase") as typeof import("@/lib/supabase");
}

describe("lib/supabase.ts — M-3 AsyncStorage→暗号化MMKV 移行 (V25/V26/V27)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockAsyncStorageMap.clear();
    mockMmkvRegistry.clear();
    mockMmkvUnavailable = false;
    mockMmkvSetThrowForKey = null;
    mockSecureStoreGetItemShouldThrow = false;
    mockSecureStoreSetItemShouldThrow = false;
    mockCreateMMKVCalls.length = 0;
    // GoTrueClient の自動リフレッシュ等が実ネットワークに出ないようにする
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("network disabled in test"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("V26: 既存ログインユーザーのセッションが移行されて失われない", () => {
    it("AsyncStorage の既存セッションが暗号化MMKVストアに複製され、同じキーで読み取れる", async () => {
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);

      const { supabase } = importSupabaseModuleFresh();
      expect(supabase).not.toBeNull();

      // GoTrueClient は getSession() 呼び出し時に初期化 Promise を待つため、
      // これを呼べば移行 (ensureMigrated) が確実に走る。
      await supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore).toBeDefined();
      // 移行されたセッションの内容が1バイトも変わらず同じキーで読み取れる
      // = 強制ログアウトしない核心の性質
      expect(encryptedStore!.get(LEGACY_KEY)).toBe(legacySessionJson);
    });

    it("移行後、AsyncStorage 側の旧セッションキーは削除されている (平文の残留防止)", async () => {
      mockAsyncStorageMap.set(LEGACY_KEY, makeFakeSessionJson());

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(false);
    });

    it("移行後、移行済みフラグが暗号化ストアに立つ", async () => {
      mockAsyncStorageMap.set(LEGACY_KEY, makeFakeSessionJson());

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBe("1");
    });

    it("AsyncStorage に旧セッションが無い (新規ユーザー) 場合は何も migrate せず、移行済みフラグだけ立つ", async () => {
      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBe("1");
      expect(encryptedStore?.get(LEGACY_KEY)).toBeUndefined();
    });
  });

  describe("V27: 移行の冪等性 / 失敗時の非クラッシュ", () => {
    it("2回目の起動 (モジュール再読込) では AsyncStorage を再走査しない (冪等)", async () => {
      mockAsyncStorageMap.set(LEGACY_KEY, makeFakeSessionJson());

      // 1回目の「起動」: 移行が走る。
      // 注意: jest.resetModules() は require キャッシュだけでなく jest.mock ファクトリの
      // 実行結果 (jest.fn() インスタンス) も作り直すため、AsyncStorage モジュールの参照は
      // 各「起動」ごとに resetModules() 後に取り直す必要がある (取り直さないと前の起動の
      // 呼び出し履歴が残ったモックを見てしまい、2回目の呼び出し回数を正しく検証できない)。
      const mod1 = importSupabaseModuleFresh();
      const asyncStorageModuleRound1 = require("@react-native-async-storage/async-storage") as {
        default: { getAllKeys: jest.Mock };
      };
      await mod1.supabase!.auth.getSession().catch(() => undefined);
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(false);
      expect(asyncStorageModuleRound1.default.getAllKeys.mock.calls.length).toBeGreaterThan(0);

      // 2回目の「起動」: モジュールを再 import する (mockMmkvRegistry はテストファイル
      // トップレベルの Map なので、実機で「ディスクに書いたMMKVが再起動後も残っている」を
      // 模擬できる)
      const mod2 = importSupabaseModuleFresh();
      const asyncStorageModuleRound2 = require("@react-native-async-storage/async-storage") as {
        default: { getAllKeys: jest.Mock };
      };
      await mod2.supabase!.auth.getSession().catch(() => undefined);

      // 移行済みフラグが立っているため、2回目起動時の (新しく作られた) AsyncStorage モックの
      // getAllKeys は一度も呼ばれない (再走査しない = 冪等)
      expect(asyncStorageModuleRound2.default.getAllKeys.mock.calls.length).toBe(0);
    });

    it("2回目の起動でもセッションは失われたままにならない (再移行で上書き破壊されない)", async () => {
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);

      const mod1 = importSupabaseModuleFresh();
      await mod1.supabase!.auth.getSession().catch(() => undefined);

      const mod2 = importSupabaseModuleFresh();
      await mod2.supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore!.get(LEGACY_KEY)).toBe(legacySessionJson);
    });

    it("AsyncStorage.getAllKeys が例外を投げても、クラッシュせず起動を継続する (再ログイン許容)", async () => {
      const asyncStorageModule = require("@react-native-async-storage/async-storage") as {
        default: { getAllKeys: jest.Mock };
      };
      asyncStorageModule.default.getAllKeys.mockRejectedValueOnce(
        new Error("AsyncStorage read failed"),
      );

      const { supabase } = importSupabaseModuleFresh();
      await expect(supabase!.auth.getSession()).resolves.toBeDefined();

      // 失敗しても移行済みフラグは立てられ、次回以降ループしない
      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBe("1");
    });
  });

  // ===========================================================================
  // 再検証 (修正ループ第1ラウンド後): 担当 E の W-2/W-3 再構成に対する新規分岐
  // ===========================================================================
  describe("W-2 再検証: mmkv.set() 書き込み失敗時にセッションを保護する", () => {
    it("mmkv.set() が失敗すると、AsyncStorage の旧キーは削除されず、移行済みフラグも立たない (次回起動で再試行)", async () => {
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);
      mockMmkvSetThrowForKey = LEGACY_KEY; // 現行セッションキーへの書き込みだけ失敗させる

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      // 核心: 書き込みが失敗したのに旧キーを消すとセッションそのものを失うため、
      // AsyncStorage 側の平文キーは残っていなければならない (= セッションは失われていない)
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(true);
      expect(mockAsyncStorageMap.get(LEGACY_KEY)).toBe(legacySessionJson);
      // 移行未完了なので、まだフラグは立たない (次回起動で再試行される)
      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBeUndefined();
      // 暗号化ストア側にも複製されていない (書き込みが実際に失敗したことの確認)
      expect(encryptedStore?.get(LEGACY_KEY)).toBeUndefined();
    });

    it("mmkv.set() 失敗後、次回起動で書き込みが成功すれば通常通り移行が完了する", async () => {
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);
      mockMmkvSetThrowForKey = LEGACY_KEY;

      const mod1 = importSupabaseModuleFresh();
      await mod1.supabase!.auth.getSession().catch(() => undefined);
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(true); // 1回目は失敗

      mockMmkvSetThrowForKey = null; // 2回目は書き込み成功させる
      const mod2 = importSupabaseModuleFresh();
      await mod2.supabase!.auth.getSession().catch(() => undefined);

      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(false); // 今度は削除される
      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore?.get(LEGACY_KEY)).toBe(legacySessionJson);
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBe("1");
    });

    it("AsyncStorage.removeItem() (平文キー削除) だけが失敗した場合もフラグは立たず、セッションは MMKV に複製済みのまま次回起動で削除を再試行する", async () => {
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);

      // 注意: jest.resetModules() (importSupabaseModuleFresh 内) は jest.mock ファクトリの
      // 実行結果 (jest.fn() インスタンス) も作り直すため、モックへの参照は
      // importSupabaseModuleFresh() の**後**に取得しないと、古いインスタンスに
      // mockRejectedValueOnce を積んでも実際に使われるインスタンスには反映されない。
      const { supabase } = importSupabaseModuleFresh();
      const asyncStorageModule = require("@react-native-async-storage/async-storage") as {
        default: { removeItem: jest.Mock };
      };
      asyncStorageModule.default.removeItem.mockRejectedValueOnce(
        new Error("AsyncStorage removeItem failed"),
      );

      await supabase!.auth.getSession().catch(() => undefined);

      // 書き込みは成功しているのでセッションは MMKV 側で読める (失われていない)
      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      expect(encryptedStore?.get(LEGACY_KEY)).toBe(legacySessionJson);
      // だが削除に失敗したので旧キーはまだ AsyncStorage に残る
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(true);
      // 削除が未完了のためフラグは立たない (次回起動で削除だけ再試行される)
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBeUndefined();
    });

    it("再試行時、MMKV に既に値がある場合は AsyncStorage の値で上書きしない (自動リフレッシュ済みの新しいセッションを巻き戻さない)", async () => {
      const oldSessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, oldSessionJson);

      // 1回目: removeItem だけ失敗させ、書き込みは成功させて MMKV に古い値が残る状態を作る。
      // モック参照は importSupabaseModuleFresh() の後に取得する (resetModules 対策)。
      const mod1 = importSupabaseModuleFresh();
      const asyncStorageModule = require("@react-native-async-storage/async-storage") as {
        default: { removeItem: jest.Mock };
      };
      asyncStorageModule.default.removeItem.mockRejectedValueOnce(new Error("boom"));
      await mod1.supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID)!;
      expect(encryptedStore.get(LEGACY_KEY)).toBe(oldSessionJson);

      // supabase-js の自動リフレッシュ等で MMKV 側のセッションが新しい値に進んだと仮定する
      // (setItem 経由の書き込みを模擬)。
      // 注意: 中身が不正な形状 (session として解釈できない JSON) だと supabase-js 自身が
      // 「壊れたセッション」と判断して storage.removeItem() を呼び、この検証の意図
      // (巻き戻り防止) とは無関係にキーが消えてしまう。したがって有効な session 形状を
      // 維持したまま値だけ変える (access_token を変えて新旧を区別する)。
      const refreshedSessionJson = makeFakeSessionJson().replace(
        "fake-access-token",
        "refreshed-access-token",
      );
      encryptedStore.set(LEGACY_KEY, refreshedSessionJson);

      // AsyncStorage 側は削除に失敗した古い値のままなので、2回目の移行再試行が走ると
      // 古い値で MMKV を巻き戻してしまうリスクがある
      const mod2 = importSupabaseModuleFresh();
      await mod2.supabase!.auth.getSession().catch(() => undefined);

      // 巻き戻っていないこと (新しい値が保持されている) が核心
      expect(encryptedStore.get(LEGACY_KEY)).toBe(refreshedSessionJson);
      // 削除だけは今回成功するので AsyncStorage 側は片付く
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(false);
    });
  });

  describe("W-2 再検証: リトライ上限 (MAX_MIGRATION_ATTEMPTS=5)", () => {
    it("mmkv.set() が恒久的に失敗する端末では、5回目の起動でフラグが立ち諦める (無限リトライしない)", async () => {
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);
      mockMmkvSetThrowForKey = LEGACY_KEY; // 恒久的に書き込み失敗する端末を模擬

      let encryptedStore: Map<string, string> | undefined;
      for (let boot = 1; boot <= MAX_MIGRATION_ATTEMPTS; boot++) {
        const mod = importSupabaseModuleFresh();
        await mod.supabase!.auth.getSession().catch(() => undefined);
        encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);

        if (boot < MAX_MIGRATION_ATTEMPTS) {
          // 上限未達: まだフラグは立たず、試行回数カウンタが増える
          expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBeUndefined();
          expect(encryptedStore?.get(MIGRATION_ATTEMPTS_KEY)).toBe(String(boot));
        }
      }

      // 5回目でついにフラグが立ち、以後リトライしなくなる
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBe("1");
      // 諦めた結果、セッションは MMKV に複製されないまま (書き込みが一度も成功していない)
      expect(encryptedStore?.get(LEGACY_KEY)).toBeUndefined();
      // 諦めた場合、AsyncStorage 側の平文キーは削除されない
      // (=この端末では平文セッションが恒久的に残存するというトレードオフ。後述の評価参照)
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(true);

      // 上限到達後、6回目の起動をしても AsyncStorage は再走査されない (本当に諦めている)
      const mod6 = importSupabaseModuleFresh();
      const asyncStorageModuleRound6 = require("@react-native-async-storage/async-storage") as {
        default: { getAllKeys: jest.Mock };
      };
      await mod6.supabase!.auth.getSession().catch(() => undefined);
      expect(asyncStorageModuleRound6.default.getAllKeys.mock.calls.length).toBe(0);
    });
  });

  describe("W-3 再検証: 複数の legacy キーがある場合の処理", () => {
    it("現行 project ref に一致するキーは復元され、それ以外の古いキーは削除のみされる (復元されない)", async () => {
      const currentSessionJson = makeFakeSessionJson();
      const staleSessionJson = JSON.stringify({ stale: "old-project-session" });
      const staleKey = "sb-oldproject-auth-token";

      mockAsyncStorageMap.set(LEGACY_KEY, currentSessionJson); // "sb-testref-auth-token" (現行)
      mockAsyncStorageMap.set(staleKey, staleSessionJson); // 別 project の古いキー

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      // 現行キーは MMKV に復元される
      expect(encryptedStore?.get(LEGACY_KEY)).toBe(currentSessionJson);
      // 古いキーは MMKV に一切書き込まれない (復元しない=平文で残す理由がないため)
      expect(encryptedStore?.get(staleKey)).toBeUndefined();
      // 両方とも AsyncStorage からは削除される (平文残留防止)
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(false);
      expect(mockAsyncStorageMap.has(staleKey)).toBe(false);
      expect(encryptedStore?.get(MIGRATION_FLAG_KEY)).toBe("1");
    });

    it("現行 project ref に一致するキーが無い場合は、見つかった先頭のキーを暫定的に復元する", async () => {
      const staleSessionJson = JSON.stringify({ stale: "only-old-project-session" });
      const staleKey = "sb-oldproject-auth-token";
      mockAsyncStorageMap.set(staleKey, staleSessionJson);

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const encryptedStore = mockMmkvRegistry.get(ENCRYPTED_STORE_ID);
      // 一致するキーが無くても、どのプロジェクトか分からないなりに1つは復元を試みる
      expect(encryptedStore?.get(staleKey)).toBe(staleSessionJson);
      expect(mockAsyncStorageMap.has(staleKey)).toBe(false);
    });
  });

  // ===========================================================================
  // 再検証 (Reviewer 指摘・推奨事項2): SecureStore が使えないケースが1件も無かった。
  // かつ createMMKV モックが id/encryptionKey を観測できず「暗号化されているか」を
  // 区別できなかった。createMMKV への実際の呼び出し引数 (mockCreateMMKVCalls) を
  // 直接検証することで、この2点を同時に埋める。
  // ===========================================================================
  describe("M-3 残存リスクの再検証: SecureStore 不可時の非暗号 MMKV フォールバック", () => {
    it("正常系: SecureStore が使える場合、暗号化 id (supabase-auth-enc) と 32byte hex の encryptionKey で createMMKV が呼ばれる", async () => {
      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const encryptedCall = mockCreateMMKVCalls.find((c) => c.id === ENCRYPTED_STORE_ID);
      expect(encryptedCall).toBeDefined();
      expect(encryptedCall?.encryptionKey).toMatch(/^[0-9a-f]{64}$/); // 32 byte → 64 桁 hex
      // 非暗号 id では一度も呼ばれていないこと (両方が使われていたら実質フォールバックしている)
      expect(mockCreateMMKVCalls.some((c) => c.id === PLAINTEXT_STORE_ID)).toBe(false);
    });

    it("【核心】SecureStore.getItem() が例外を投げる場合、非暗号 id (supabase-auth, encryptionKey 無し) で createMMKV が呼ばれる (暗号化されないフォールバックが実際に発生する)", async () => {
      mockSecureStoreGetItemShouldThrow = true;

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const plaintextCall = mockCreateMMKVCalls.find((c) => c.id === PLAINTEXT_STORE_ID);
      expect(plaintextCall).toBeDefined();
      expect(plaintextCall?.encryptionKey).toBeUndefined();
      // 暗号化 id では一度も呼ばれていないこと (= このセッションは平文でしか保存されない)
      expect(mockCreateMMKVCalls.some((c) => c.id === ENCRYPTED_STORE_ID)).toBe(false);
    });

    it("SecureStore.setItem() (新規鍵の永続化) が例外を投げる場合も、同様に非暗号 id にフォールバックする", async () => {
      // getItem は成功 (既存鍵が無い = null を返す) が、新規生成した鍵の setItem が失敗するケース。
      // getAuthEncryptionKey() 全体が try/catch で囲われているため、setItem 失敗時点で
      // 例外が外側の catch に飛び、鍵生成自体が undefined 扱いになることを確認する。
      mockSecureStoreSetItemShouldThrow = true;

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      const plaintextCall = mockCreateMMKVCalls.find((c) => c.id === PLAINTEXT_STORE_ID);
      expect(plaintextCall).toBeDefined();
      expect(plaintextCall?.encryptionKey).toBeUndefined();
      expect(mockCreateMMKVCalls.some((c) => c.id === ENCRYPTED_STORE_ID)).toBe(false);
    });

    it("SecureStore が使えずフォールバックしても、セッションの移行自体はクラッシュせず完了する (平文だが失われない)", async () => {
      mockSecureStoreGetItemShouldThrow = true;
      const legacySessionJson = makeFakeSessionJson();
      mockAsyncStorageMap.set(LEGACY_KEY, legacySessionJson);

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      // 暗号化されていない "supabase-auth" ストアにセッションが複製されている
      // (これは実装が意図的に許容している残存リスクであり、クラッシュしないことが目的)
      const plaintextStore = mockMmkvRegistry.get(PLAINTEXT_STORE_ID);
      expect(plaintextStore?.get(LEGACY_KEY)).toBe(legacySessionJson);
      expect(mockAsyncStorageMap.has(LEGACY_KEY)).toBe(false);
    });
  });

  describe("V25: react-native-mmkv が使えない (Expo Go 相当) 環境でのフォールバック", () => {
    it("createMMKV が throw する環境でも supabase クライアントの作成自体はクラッシュしない", async () => {
      mockMmkvUnavailable = true;

      const { supabase } = importSupabaseModuleFresh();
      expect(supabase).not.toBeNull();
      await expect(supabase!.auth.getSession()).resolves.toBeDefined();
    });

    it("createMMKV が使えない環境で clearMmkvCaches() を呼んでもクラッシュしない", async () => {
      mockMmkvUnavailable = true;

      const { clearMmkvCaches } = importSupabaseModuleFresh();
      expect(() => clearMmkvCaches()).not.toThrow();
    });

    it("MMKV が使えない環境では AsyncStorage の移行も行われない (メモリ内フォールバックに格納)", async () => {
      mockMmkvUnavailable = true;
      mockAsyncStorageMap.set(LEGACY_KEY, makeFakeSessionJson());

      const { supabase } = importSupabaseModuleFresh();
      await supabase!.auth.getSession().catch(() => undefined);

      // mockMmkvRegistry には何も書き込まれない (createMMKV 自体が呼べないため)
      expect(mockMmkvRegistry.size).toBe(0);
    });
  });
});
