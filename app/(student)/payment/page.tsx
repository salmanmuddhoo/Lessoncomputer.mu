import { redirect } from 'next/navigation'

// /payment with no sub-path → send to dashboard
export default function PaymentPage() {
  redirect('/dashboard')
}
