// Accepted card brands, shown on checkout before the Pay button (Developer Work §4).
export function CardLogos({ className = 'h-6' }: { className?: string }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="We accept Visa, Mastercard and American Express">
      <svg viewBox="0 0 48 30" className={className} role="img" aria-label="Visa">
        <rect width="48" height="30" rx="4" fill="#1A1F71" />
        <text x="24" y="20" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="700" fontStyle="italic" fill="#FFFFFF">VISA</text>
      </svg>
      <svg viewBox="0 0 48 30" className={className} role="img" aria-label="Mastercard">
        <rect width="48" height="30" rx="4" fill="#252525" />
        <circle cx="19" cy="15" r="8.5" fill="#EB001B" />
        <circle cx="29" cy="15" r="8.5" fill="#F79E1B" />
        <path d="M24 8.1a8.5 8.5 0 0 1 0 13.8a8.5 8.5 0 0 1 0-13.8z" fill="#FF5F00" />
      </svg>
      <svg viewBox="0 0 48 30" className={className} role="img" aria-label="American Express">
        <rect width="48" height="30" rx="4" fill="#006FCF" />
        <text x="24" y="19" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="700" fill="#FFFFFF">AMEX</text>
      </svg>
    </div>
  )
}
