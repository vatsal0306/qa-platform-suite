import { SEEDED } from '../bugs';

// BUG-012: badge text colour (#9aa0a6 on a pale background) fails WCAG 1.4.3 contrast (4.5:1)
export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status} ${SEEDED ? 'badge-lowcontrast' : ''}`} data-testid="status">{status}</span>;
}
