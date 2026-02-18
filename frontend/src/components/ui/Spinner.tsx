export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="cluster" role="status" aria-live="polite">
      <span className="ui-spinner" aria-hidden />
      <span className="text-muted">{label}</span>
    </div>
  );
}
