import { SITE_URL } from '@/lib/seo'

// Plain-text summary for AI assistants (llmstxt.org). Facts mirror the About page and footer.
export function GET() {
  const body = `# LessonComputer.mu

> Online Cambridge Computer Science tuition: live classes and video courses for IGCSE Computer Science (0478), O Level Computer Science (2210) and AS & A Level Computer Science (9618), plus ICT for Grades 7–9 (NCE). Taught from Mauritius, open to students worldwide.

Run by Lesson Computer Ltd (Business Registration No. C24215107), Belvedere Road, Brisée Verdière, 1402-03, Mauritius. Teacher: Mr Muddhoo Shoheb — BSc Electronics and Computer Science, PGCE, 15+ years teaching Cambridge Computer Science.

## Main pages

- [Courses](${SITE_URL}/grades): every course, with video lessons and live class subscriptions
- [Live classes](${SITE_URL}/live-classes): live online classes and how they work
- [Pricing](${SITE_URL}/pricing): video packages and monthly live class subscriptions
- [About the teacher](${SITE_URL}/about): qualifications and syllabuses taught
- [Contact](${SITE_URL}/contact): questions about courses, class times or enrolment
- [Blog](${SITE_URL}/blog): study tips and guides

## Policies

- [Terms of Service](${SITE_URL}/terms)
- [Refund Policy](${SITE_URL}/refunds)
- [Delivery Policy](${SITE_URL}/delivery)
- [Privacy Policy](${SITE_URL}/privacy)
- [Safeguarding & Class Conduct](${SITE_URL}/safeguarding)

## Contact

- Email: lessonscomputers@gmail.com
- Phone / WhatsApp: +230 5915 1012
`
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
