/**
 * Legal / policy page content.
 *
 * Structure only — every string here is placeholder copy written as real,
 * scannable prose (headings, short paragraphs, bullet lists) rather than lorem
 * ipsum, so the final legal text can be dropped in line by line. Anything that
 * needs a real value before publication is left in [square brackets].
 *
 * Both documents render through {@link LegalArticle}. The `id` on each section
 * is the smooth-scroll anchor target; keep it stable once a policy is public,
 * because external links and the on-page table of contents both depend on it.
 */

// --- Model -----------------------------------------------------------------

/** One rendered unit inside a section, in document order. */
export type LegalBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "list"; items: LegalListItem[] };

/** A bullet, optionally with its own nested bullets. */
export type LegalListItem = string | { text: string; items?: string[] };

export interface LegalSection {
  /** Smooth-scroll anchor (`#id`) and table-of-contents target. Stable once public. */
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  /** Page `<h1>` and browser tab title stem. */
  title: string;
  /** Short overline shown above the title (rendered as a pill). */
  eyebrow: string;
  /** Human-readable date for the "Last Updated" metadata line. */
  lastUpdated: string;
  /** One or more lead paragraphs shown before the first numbered section. */
  intro: string[];
  sections: LegalSection[];
}

// --- Shared destinations --------------------------------------------------

/** Route for the Privacy Policy page. */
export const PRIVACY_HREF = "/privacy";

/** Route for the Refund & Cancellation Policy page. */
export const REFUND_HREF = "/refund";

/**
 * The effective date shown on every legal page.
 *
 * One constant so the two policies never drift apart on the visible date. Update
 * it whenever either document's substance changes.
 */
export const LEGAL_LAST_UPDATED = "September 7, 2026";

// --- Privacy Policy -------------------------------------------------------

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  eyebrow: "Legal",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "BayanHealth (“BayanHealth”, “we”, “us”, or “our”) is committed to protecting the privacy of every patient, clinician, and partner who uses our platform. This Privacy Policy explains what personal and health information we collect, why we collect it, how we use and share it, and the choices and rights you have.",
    "This policy applies to the BayanHealth website, web application, and any related services that link to it (together, the “Services”). It does not apply to third-party websites, products, or services we do not control. By using the Services you acknowledge that you have read and understood this policy.",
  ],
  sections: [
    {
      id: "introduction",
      heading: "Introduction & Scope",
      blocks: [
        {
          kind: "paragraph",
          text: "We process personal information in accordance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and the issuances of the National Privacy Commission (NPC). Where we serve users outside the Philippines, we also honour the applicable local data protection requirements.",
        },
        {
          kind: "paragraph",
          text: "“Personal information” means any information that identifies you or can reasonably be linked to you. “Sensitive personal information” and “health information” include details about your physical or mental health, medical history, and the care you receive through the Services.",
        },
      ],
    },
    {
      id: "information-we-collect",
      heading: "Information We Collect",
      blocks: [
        { kind: "subheading", text: "Information you provide to us" },
        {
          kind: "list",
          items: [
            "Account details: name, email address, mobile number, and password.",
            "Profile details: date of birth, sex, address, preferred language, and emergency contact.",
            "Waitlist details: the information you submit when joining the early-access list, including the audience segment you select and, for partners, an organisation name.",
            "Payment details: billing name and transaction records. Card and e-wallet credentials are handled by our payment processor and are not stored on our servers.",
            "Communications: messages you send to support, feedback, and survey responses.",
          ],
        },
        { kind: "subheading", text: "Health information" },
        {
          kind: "list",
          items: [
            "Symptoms, reason for visit, and intake questionnaire answers.",
            "Consultation notes, assessments, prescriptions, laboratory requests, and referrals created by the attending clinician.",
            "Care summaries and follow-up records generated after a consultation.",
          ],
        },
        { kind: "subheading", text: "Information collected automatically" },
        {
          kind: "list",
          items: [
            "Device and connection data: IP address, browser type, operating system, and device identifiers.",
            "Usage data: pages viewed, features used, referring pages, and timestamps.",
            "Cookies and similar technologies, as described in “Cookies & Tracking Technologies” below.",
          ],
        },
        {
          kind: "paragraph",
          text: "We do not knowingly collect more information than we need for the purposes set out in this policy.",
        },
      ],
    },
    {
      id: "how-we-use-information",
      heading: "How We Use Your Information",
      blocks: [
        { kind: "paragraph", text: "We use the information we collect to:" },
        {
          kind: "list",
          items: [
            "Create and administer your account and verify your identity.",
            "Facilitate consultations between you and licensed clinicians, including video, voice, and chat sessions.",
            "Generate, store, and deliver care summaries, prescriptions, and referrals.",
            "Process payments and issue receipts.",
            "Send service messages such as appointment confirmations, reminders, and follow-ups.",
            "Provide customer support and respond to your requests.",
            "Monitor, secure, debug, and improve the Services, including research and analytics conducted on de-identified or aggregated data.",
            "Comply with legal, regulatory, professional, and accreditation obligations.",
          ],
        },
        {
          kind: "paragraph",
          text: "We use health information only for providing care, for the administration directly related to that care, and where required or permitted by law. We do not sell your personal or health information, and we do not use it for third-party advertising.",
        },
      ],
    },
    {
      id: "legal-bases",
      heading: "Legal Bases for Processing",
      blocks: [
        {
          kind: "paragraph",
          text: "Depending on the activity, we rely on one or more of the following legal bases under the Data Privacy Act:",
        },
        {
          kind: "list",
          items: [
            { text: "Consent", items: ["for joining the waitlist, optional communications, and any processing of sensitive personal information not otherwise permitted by law."] },
            { text: "Contract", items: ["to deliver the Services you have requested and to administer your account."] },
            { text: "Legal obligation", items: ["to meet record-keeping, tax, public-health, and regulatory requirements."] },
            { text: "Legitimate interests", items: ["to secure the platform, prevent fraud and abuse, and improve the Services, balanced against your rights and interests."] },
            { text: "Vital interests", items: ["to act in a medical emergency where you are unable to give consent."] },
          ],
        },
        {
          kind: "paragraph",
          text: "Where we rely on consent, you may withdraw it at any time by contacting us. Withdrawing consent does not affect processing already carried out, and some Services cannot be provided without the information concerned.",
        },
      ],
    },
    {
      id: "how-we-share-information",
      heading: "How We Share Information",
      blocks: [
        { kind: "paragraph", text: "We share personal and health information only as described here:" },
        {
          kind: "list",
          items: [
            { text: "Treating clinicians", items: ["the licensed doctor or health professional handling your consultation, and any clinician to whom you are referred, receive the information needed to provide care."] },
            { text: "Service providers", items: ["vendors that host our infrastructure, process payments, deliver messages, or provide analytics and support tooling, each bound by contract to protect the information and use it only on our instructions."] },
            { text: "Partner organisations", items: ["where your care is sponsored by an employer, LGU, school, or similar partner, we share only the minimum data needed for eligibility and billing — never your clinical records — and only with your knowledge."] },
            { text: "Legal and safety", items: ["government agencies, regulators, courts, or law enforcement where disclosure is required by law, court order, or lawful request, or to protect the rights, safety, or property of any person."] },
            { text: "Business transfers", items: ["if BayanHealth is involved in a merger, acquisition, financing, or sale of assets, information may be transferred as part of that transaction, subject to this policy."] },
          ],
        },
        {
          kind: "paragraph",
          text: "We may share de-identified or aggregated information that cannot reasonably be used to identify you for research, reporting, and service improvement.",
        },
      ],
    },
    {
      id: "data-retention",
      heading: "Data Retention",
      blocks: [
        {
          kind: "paragraph",
          text: "We keep personal information only for as long as necessary for the purposes set out in this policy, unless a longer period is required or permitted by law.",
        },
        {
          kind: "list",
          items: [
            "Medical and consultation records are retained for at least [retention period, e.g. 15 years] in line with professional and regulatory requirements.",
            "Account and billing records are retained for the life of your account and for [period, e.g. 10 years] afterward for tax and audit purposes.",
            "Waitlist information is retained until the early-access programme closes or you ask us to remove it, whichever comes first.",
            "Server logs and analytics data are retained for [period, e.g. 12 months].",
          ],
        },
        {
          kind: "paragraph",
          text: "When information is no longer needed, we securely delete, anonymise, or de-identify it.",
        },
      ],
    },
    {
      id: "data-security",
      heading: "Data Security",
      blocks: [
        {
          kind: "paragraph",
          text: "We maintain organisational, physical, and technical safeguards designed to protect personal and health information against unauthorised access, alteration, disclosure, or destruction. These include:",
        },
        {
          kind: "list",
          items: [
            "Encryption of data in transit and at rest.",
            "Role-based access controls, so staff and clinicians see only the information they need.",
            "Audit logging of access to clinical records.",
            "Regular security testing, monitoring, and staff training.",
          ],
        },
        {
          kind: "paragraph",
          text: "No method of transmission or storage is completely secure. If we become aware of a personal data breach that is likely to put your rights and freedoms at risk, we will notify you and the National Privacy Commission as required by law.",
        },
      ],
    },
    {
      id: "your-rights",
      heading: "Your Rights",
      blocks: [
        {
          kind: "paragraph",
          text: "Subject to the limits set by law, you have the right to:",
        },
        {
          kind: "list",
          items: [
            "Be informed about how your personal information is processed.",
            "Access the personal information we hold about you and obtain a copy.",
            "Correct information that is inaccurate, outdated, or incomplete.",
            "Object to, or request that we restrict, certain processing.",
            "Request erasure or blocking of information where there is no lawful basis to keep it.",
            "Data portability — receive a copy of certain information in a structured, commonly used, electronic format.",
            "Withdraw consent where processing is based on consent.",
            "Lodge a complaint with the National Privacy Commission, and to be indemnified for damage caused by unlawful processing.",
          ],
        },
        {
          kind: "paragraph",
          text: "To exercise any of these rights, contact us using the details in “Contact Us”. We may need to verify your identity before acting, and we will respond within the period required by law.",
        },
      ],
    },
    {
      id: "cookies",
      heading: "Cookies & Tracking Technologies",
      blocks: [
        {
          kind: "paragraph",
          text: "We use cookies and similar technologies to keep you signed in, remember your preferences, secure the Services, and understand how the Services are used.",
        },
        {
          kind: "list",
          items: [
            { text: "Strictly necessary", items: ["required for the Services to function, such as authentication and security. These cannot be switched off."] },
            { text: "Functional", items: ["remember choices such as language and theme."] },
            { text: "Analytics", items: ["help us measure and improve performance, on a de-identified basis where possible."] },
          ],
        },
        {
          kind: "paragraph",
          text: "You can control cookies through your browser settings. Blocking some cookies may affect how the Services work.",
        },
      ],
    },
    {
      id: "childrens-privacy",
      heading: "Children's Privacy",
      blocks: [
        {
          kind: "paragraph",
          text: "The Services are intended for use by adults. A parent or legal guardian may use the Services to seek care for a minor in their care, and is responsible for the information they provide about that minor.",
        },
        {
          kind: "paragraph",
          text: "We do not knowingly allow anyone under [age, e.g. 18] to create an account. If you believe a minor has provided us information without the involvement of a parent or guardian, contact us and we will take appropriate steps.",
        },
      ],
    },
    {
      id: "international-transfers",
      heading: "International Data Transfers",
      blocks: [
        {
          kind: "paragraph",
          text: "Some of our service providers process information outside the Philippines. Where we transfer personal information across borders, we use contractual and technical measures designed to ensure a comparable level of protection to that required under Philippine law.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to This Policy",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update this Privacy Policy from time to time. When we do, we will revise the “Last Updated” date at the top of this page and, where the changes are significant, provide a more prominent notice or seek your consent as required.",
        },
        {
          kind: "paragraph",
          text: "We encourage you to review this page periodically. Continued use of the Services after an update takes effect means you accept the revised policy.",
        },
      ],
    },
    {
      id: "contact-us",
      heading: "Contact Us",
      blocks: [
        {
          kind: "paragraph",
          text: "If you have questions about this policy or wish to exercise your rights, contact our Data Protection Officer:",
        },
        {
          kind: "list",
          items: [
            "Data Protection Officer, BayanHealth",
            "Email: [privacy@bayanhealth.co]",
            "Postal address: [registered business address]",
            "Contact number: [phone number]",
          ],
        },
        {
          kind: "paragraph",
          text: "You may also contact the National Privacy Commission at www.privacy.gov.ph if you believe your rights under the Data Privacy Act have been violated.",
        },
      ],
    },
  ],
};

// --- Refund & Cancellation Policy ---------------------------------------

export const REFUND_POLICY: LegalDocument = {
  title: "Refund & Cancellation Policy",
  eyebrow: "Legal",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "This Refund & Cancellation Policy explains when a BayanHealth consultation or service can be cancelled, when you are entitled to a refund, and how refunds are processed. It forms part of our Terms of Service.",
    "This policy covers paid consultations and related services booked through the BayanHealth platform. It does not cover charges billed directly by a third party, such as a pharmacy, laboratory, or referral facility.",
  ],
  sections: [
    {
      id: "overview",
      heading: "Overview",
      blocks: [
        {
          kind: "paragraph",
          text: "We want you to feel confident booking care with BayanHealth. If a consultation does not go ahead, or does not go ahead as arranged, this policy sets out what happens to your payment. Where a situation is not covered here, contact support and we will review it in good faith.",
        },
      ],
    },
    {
      id: "cancellations-by-you",
      heading: "Cancellations by You",
      blocks: [
        {
          kind: "paragraph",
          text: "You can cancel or reschedule a booking from your account or by contacting support. What you are entitled to depends on when you cancel:",
        },
        {
          kind: "list",
          items: [
            { text: "More than [X hours, e.g. 2 hours] before the scheduled start", items: ["full refund, or free reschedule."] },
            { text: "Within [X hours] of the scheduled start", items: ["a cancellation fee of [amount or percentage] may apply; the remainder is refunded."] },
            { text: "After the scheduled start, or no-show", items: ["no refund, because the clinician's time was reserved for you. You may still be able to reschedule for a fee at our discretion."] },
          ],
        },
        {
          kind: "paragraph",
          text: "If you experience a genuine emergency or technical problem that prevents you from attending, contact support within [timeframe, e.g. 24 hours] and we will review your request.",
        },
      ],
    },
    {
      id: "cancellations-by-bayanhealth",
      heading: "Cancellations by BayanHealth or the Physician",
      blocks: [
        {
          kind: "paragraph",
          text: "Occasionally a consultation must be cancelled on our side — for example, if the assigned clinician becomes unavailable, or a platform issue prevents the session from going ahead.",
        },
        {
          kind: "list",
          items: [
            "You will be offered the choice of a full refund or a rescheduled consultation at no extra cost.",
            "If a consultation ends early or cannot be completed for reasons attributable to us or the clinician, you may be entitled to a full or partial refund based on the care actually provided.",
            "We are not responsible for failures caused by your own device, internet connection, or software, but support will always try to help you reconnect.",
          ],
        },
      ],
    },
    {
      id: "refund-eligibility",
      heading: "Refund Eligibility",
      blocks: [
        { kind: "paragraph", text: "You are generally eligible for a refund where:" },
        {
          kind: "list",
          items: [
            "You cancelled within the free-cancellation window described above.",
            "BayanHealth or the clinician cancelled the consultation.",
            "You were charged in error, or charged more than once for the same booking.",
            "A confirmed clinician did not join the session and no substitute was provided within a reasonable time.",
          ],
        },
      ],
    },
    {
      id: "non-refundable",
      heading: "Non-Refundable Items",
      blocks: [
        { kind: "paragraph", text: "The following are not refundable, except where the law requires otherwise:" },
        {
          kind: "list",
          items: [
            "Consultations that were completed as booked, including where you were dissatisfied with the clinical opinion given.",
            "No-shows and late cancellations outside the free-cancellation window.",
            "Fees for services already delivered, such as an issued prescription, medical certificate, or referral.",
            "Third-party costs paid to a pharmacy, laboratory, or referral facility.",
            "Promotional credits, vouchers, or consultations provided at no charge.",
          ],
        },
      ],
    },
    {
      id: "how-to-request",
      heading: "How to Request a Refund",
      blocks: [
        { kind: "paragraph", text: "To request a refund:" },
        {
          kind: "list",
          items: [
            { text: "Contact support", items: ["email [support@bayanhealth.co] or use the in-app help option."] },
            { text: "Include your details", items: ["the account email, the booking reference, the date of the consultation, and the reason for the request."] },
            { text: "Submit within the window", items: ["refund requests should be made within [X days, e.g. 7 days] of the consultation date."] },
          ],
        },
        {
          kind: "paragraph",
          text: "We will acknowledge your request within [timeframe, e.g. 2 business days] and tell you the outcome within [timeframe, e.g. 7 business days].",
        },
      ],
    },
    {
      id: "processing-times",
      heading: "Refund Processing Times & Methods",
      blocks: [
        {
          kind: "list",
          items: [
            "Approved refunds are issued to the original payment method used for the booking.",
            "Card refunds typically take [X–Y business days] to appear, depending on your bank.",
            "E-wallet refunds are usually processed within [X business days].",
            "Where the original method is unavailable, we will arrange an alternative of equivalent value.",
          ],
        },
        {
          kind: "paragraph",
          text: "BayanHealth does not charge a processing fee for refunds. Any fee deducted by a bank or payment provider is outside our control.",
        },
      ],
    },
    {
      id: "packages-and-subscriptions",
      heading: "Packages & Subscription Plans",
      blocks: [
        {
          kind: "paragraph",
          text: "Where you buy a multi-consultation package or a subscription:",
        },
        {
          kind: "list",
          items: [
            "You may cancel a subscription at any time; cancellation takes effect at the end of the current billing period and stops future charges.",
            "Unused consultations in a package may be refunded on a pro-rata basis, less any consultations already used at their standard price and any applicable fees.",
            "Packages and subscriptions have a validity period of [duration]; consultations not used within that period expire and are not refundable.",
          ],
        },
      ],
    },
    {
      id: "disputes-and-chargebacks",
      heading: "Disputes & Chargebacks",
      blocks: [
        {
          kind: "paragraph",
          text: "If you disagree with a refund decision, you can ask us to review it by replying to the support thread with any additional information. We aim to resolve disputes within [timeframe].",
        },
        {
          kind: "paragraph",
          text: "Please contact us before initiating a chargeback with your bank or card issuer. A chargeback raised while a refund request is already being handled may delay the resolution, and repeated unwarranted chargebacks may lead to suspension of your account.",
        },
      ],
    },
    {
      id: "contact-us",
      heading: "Contact Us",
      blocks: [
        {
          kind: "paragraph",
          text: "For any question about cancellations or refunds:",
        },
        {
          kind: "list",
          items: [
            "BayanHealth Support",
            "Email: [support@bayanhealth.co]",
            "Contact number: [phone number]",
            "Support hours: [days and hours]",
          ],
        },
      ],
    },
  ],
};
