"use client";

export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="text-sm text-blue-600 hover:text-blue-800"
    >
      ← 戻る
    </button>
  );
}
