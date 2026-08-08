/**
 * CSV セルとして安全な文字列に変換する。
 * - ダブルクォートは `""` にエスケープする
 * - 表計算ソフトが数式と誤認する先頭文字（=+-@ および TAB/CR）にはシングルクォートを付与する（CSVインジェクション対策）
 *   TAB(\t)/CR(\r)始まりも、表計算ソフトが先頭の空白扱い文字を読み飛ばして後続を数式と解釈しうるため対象に含む(OWASP)。
 *   LF(\n)はダブルクォートで囲まれた正規の複数行データを壊すため対象外とする。
 */
export const escapeCsvValue = (value: string): string => {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
};
