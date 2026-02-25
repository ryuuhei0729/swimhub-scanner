export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary ${className}`}
      role="status"
      aria-label="読み込み中"
    />
  );
}
