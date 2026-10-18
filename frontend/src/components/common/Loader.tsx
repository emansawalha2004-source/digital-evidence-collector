interface LoaderProps {
  label?: string;
}

export function Loader({ label = "Loading data..." }: LoaderProps) {
  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <span className="loader" />
      <span>{label}</span>
    </div>
  );
}