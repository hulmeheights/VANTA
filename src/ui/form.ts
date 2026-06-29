import { contactEmail } from './content'

// Contact form. No backend by design (per brief): log the payload and hand off to
// the user's mail client. Swap the marked block for a real endpoint when ready.

export function initForm(): void {
  const form = document.getElementById('enquiry') as HTMLFormElement | null
  const status = document.getElementById('enquiry-status')
  if (!form) return

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!form.reportValidity()) return

    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>

    // ───────────────────────────────────────────────────────────────────────
    // TODO: wire to a real backend / email service (e.g. POST to an endpoint or
    // a form service). For now we log the payload and open a mailto: fallback.
    console.log('[VANTA] enquiry submitted →', data)

    const subject = encodeURIComponent(`Project enquiry — ${data.name ?? ''}`)
    const body = encodeURIComponent(
      `Name: ${data.name ?? ''}\n` +
        `Email: ${data.email ?? ''}\n` +
        `Company: ${data.company ?? ''}\n` +
        `Discipline: ${data.scope ?? ''}\n\n` +
        `${data.message ?? ''}`,
    )
    window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, '_blank')
    // ───────────────────────────────────────────────────────────────────────

    if (status) {
      status.textContent =
        'Thank you — opening your mail client. (Demo form: the enquiry was also logged to the console.)'
    }
    form.reset()
  })
}
