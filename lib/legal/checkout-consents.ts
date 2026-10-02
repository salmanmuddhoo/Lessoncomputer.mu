// Checkout tick boxes (Developer Work §5), word for word. Shared by the checkout UI and the
// payment route, which stores this exact text with each tick — never the client's copy.

export type ConsentType = 'terms' | 'guardian' | 'immediate_access'

export const CONSENT_TEXT: Record<ConsentType, string> = {
  terms: 'I have read and accept the Terms of Service, the Refund Policy and the Privacy Policy.',
  guardian:
    'I am the parent or legal guardian of this student. I accept these Terms on the student’s behalf, I agree to the student attending live classes with the camera switched on, and I confirm that the card being used is mine or is used with the cardholder’s permission. I understand that the teacher’s lesson is recorded but that nothing of my child is recorded — not the camera image, not the voice, not the chat.',
  immediate_access:
    'I want access to the content immediately and I understand that I lose my 14-day right to cancel once access is given.',
}

export const RECORDING_NOTICE =
  'Live classes are held on Zoom and the teacher’s lesson is recorded so that students can watch it again. Recordings show the teacher’s screen and voice only. Students are never recorded — not their face, not their voice, not their chat messages.'

export const PAYMENT_PROCESSOR_LINE = 'Payments are processed securely by MIPS through MCB. We never store your card details.'

// What the browser sends: when each box was ticked (ISO string), or absent if not ticked.
export type ConsentTicks = Partial<Record<ConsentType, string>> & { studentUnder18?: boolean }
