import clsx from 'clsx';

/**
 * Wordmark sementara. Ganti dengan logo resmi UMIRA:
 * simpan file di apps/web/public/logo-umira.svg lalu ganti isi komponen ini dengan <img>.
 */
export function Logo({ inverted, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        {/* Monogram: dua kolom struktur + balok tembaga */}
        <rect x="1" y="1" width="30" height="30" rx="7" fill={inverted ? '#ffffff' : '#0E3B43'} />
        <path d="M9 9v9.5a7 7 0 0 0 14 0V9" fill="none" stroke={inverted ? '#0E3B43' : '#ffffff'} strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="16" cy="9" r="2.2" fill="#B5651D" />
      </svg>
      <span className="leading-none">
        <span className={clsx('block text-[17px] font-extrabold tracking-[0.08em]', inverted ? 'text-white' : 'text-ink')}>UMIRA</span>
        <span className={clsx('mt-0.5 block text-2xs font-semibold', inverted ? 'text-white/60' : 'text-text-muted')}>IT Helpdesk</span>
      </span>
    </span>
  );
}
