# Posture brief template — what to give Claude each quarter

This is the **current-security-posture** input the operator provides at the
start of each review. Without it, the priority section of the output is
abstract: it reflects the control change against classification and
Essential Eight claim, not the product's actual security state. With it,
Claude can tell you whether a change that looks P0 on paper is actually
low-risk because the underlying capability is already over-engineered, or
whether a change that looks P2 is actually higher-risk because you have a
known gap in that area.

## How to use this template

1. Copy the template in §4 below.
2. Fill in what you know. **Leave sections blank if you don't know them** —
   don't guess. A partial posture is better than a fabricated one.
3. Paste the filled template into the opening message of each review chat,
   or save it as a knowledge file that you re-upload each quarter (keep a
   timestamp in the filename).
4. Update it at least every quarter. Posture ages fast.

The template is intentionally short. If filling it in takes more than 30
minutes the first time, that itself is a signal — your product's posture
is not well-understood by anyone, and the priority framework should flag
that as a risk in its own right.

## What Claude does with the brief

Claude uses the posture brief as input to the **posture-grounded
adjustment** in `PRIORITY_FRAMEWORK.md §5` (see that file for the full
logic). In short:

- **Upgrades**: a change lands on a capability the operator has flagged as
  weak / partially compensated / open-finding / missing-evidence. The
  change's priority is bumped one bucket (P1 → P0, P2 → P1).
- **Downgrades**: a change lands on a capability the operator has flagged
  as over-engineered / already stronger than the new baseline / owned and
  evidenced end-to-end by a trusted platform. The change's priority is
  bumped down one bucket.
- **No change**: no posture signal touches the change. The framework's
  default priority stands.

Every adjustment is surfaced explicitly in the output under "Posture
adjustments applied" so a reviewer can audit the inference — Claude never
silently changes a priority.

## Honesty clauses (read these before you start)

- **This brief stays in the chat.** It does not leave the session. If you
  are uncomfortable pasting specific finding IDs or vendor names, redact
  them — Claude can work with "open critical finding on identity, platform:
  Azure, opened Q1, no ETA" without the finding ID.
- **Partial is fine.** Fill in what you know. Missing sections are marked
  "unknown" in the output disclaimer rather than assumed.
- **Staleness is a signal.** If the last IRAP report is 3 years old, say
  so. Claude will note it and lean on other inputs.
- **This is not a risk register.** Keep it short. The goal is to help
  Claude ground the priority inference, not to duplicate your ISMS.

---

## The template

Copy everything below this line into your chat or paste into a knowledge
file named `posture-<product>-<quarter>.md`.

```markdown
# Posture brief — <product name> — <quarter / date>

## 1. Accreditation state

- **Current accreditation**: <e.g. IRAP-assessed PROTECTED, issued 2025-09>
- **Next assessment checkpoint**: <e.g. 6-monthly review due 2026-09>
- **Accrediting authority**: <e.g. agency name, or "not yet accredited">
- **Any in-flight re-accreditation**: <yes / no, status>

## 2. Essential Eight maturity — claimed vs actual

| Pillar | Claimed ML | Actual ML (honestly) | Last independent check |
| --- | --- | --- | --- |
| Application control | e.g. ML2 | e.g. ML1 (gap: user-mode execution not blocked everywhere) | e.g. Feb 2026 internal |
| Patch applications | | | |
| Configure MS Office macros | | | |
| User application hardening | | | |
| Restrict admin privileges | | | |
| Patch operating systems | | | |
| Multi-factor authentication | | | |
| Regular backups | | | |

If you have not measured actual vs claimed, say so — Claude will treat the
CCM-side claim as the only input and flag that in the output.

## 3. Open IRAP / assessor findings

List the open findings from your last IRAP or equivalent assessment that
are not yet closed. One line each. Don't list closed findings.

| Finding ref | Area (Guideline / pillar) | Severity | Opened | ETA / status |
| --- | --- | --- | --- | --- |
| e.g. FIND-2025-003 | Identity — privileged access | High | 2025-09 | In remediation, ETA 2026-06 |

If none, write "*No open IRAP findings.*"

## 4. Top open risks

The top 5 (not all) open risks on the product's risk register that touch
the ISM control surface. Keep it short.

| Risk | Relevant Guideline / area | Residual rating | Notes |
| --- | --- | --- | --- |
| e.g. Shared-service log-retention gap | System monitoring | Medium | Vendor upgrade blocked by contract renewal |

## 5. Known control weaknesses and compensating controls

Any control where you know the implementation is partial, compensated,
or relying on organisational process rather than engineering enforcement.
Be honest — this is where Claude can add the most value.

- e.g. "Application control is at ML1 in production; ML2 is compensated
  by tight change-management + EDR rather than by the control itself."
- e.g. "DNS filtering is provided by the platform but our SSP-A claims it
  as a product control — needs re-scoping."

## 6. Platform-evidenced vs product-evidenced controls

Which Guidelines / pillars are genuinely **handled by the hyperscaler
or shared service** with current evidence, vs. which ones the SSP-A
asserts as platform-evidenced but the product team actually has to
demonstrate itself. This is the distinction that most often drives
false-positive P0s.

- **Truly platform-evidenced (current assurance letter on file)**:
  e.g. physical security, hypervisor hardening, datacentre networking.
- **Claimed platform but product actually demonstrates**:
  e.g. application-level logging, session management, patch cadence
  for product components.
- **Shared — both parties have obligations**:
  e.g. identity (platform runs the IdP; product configures policies).

## 7. Last pen-test / red-team summary

- **Date**: <e.g. 2025-11>
- **Scope**: <e.g. product web + API, external only>
- **Top residual findings (open)**: <one line each>
- **Findings closed since**: <count>

If you've never run one, say so. Claude will adjust accordingly.

## 8. In-flight remediation / uplift programmes

Work already underway that will affect the posture during this quarter.
This prevents Claude from flagging something as P0 when you've already got
a workstream landing in 6 weeks that closes the gap.

- e.g. "Identity platform uplift to phishing-resistant MFA — mid-flight,
  target complete by end of Q3."

## 9. Anything unusual about this product's posture

Free text. Air-gapped deployment? Federal-only tenancy? Unusual data
classification envelope? Recent incident that reset a capability? Put it
here. One paragraph is plenty.

## 10. Brief authored by / date

- **Author**: <name, role>
- **Date**: <YYYY-MM-DD>
- **Confidence**: <high / medium / low — how confident you are this
  reflects reality, not what's in the SSP-A>
```

---

## Example — a filled-in brief

Below is a minimal but realistic example. Names and IDs are fictional.

```markdown
# Posture brief — FakeGovPlatform — June 2026

## 1. Accreditation state
- Current accreditation: IRAP-assessed PROTECTED (2024-08)
- Next assessment checkpoint: 6-monthly review 2026-08
- Accrediting authority: Dept of Imaginary Affairs
- In-flight re-accreditation: no

## 2. Essential Eight maturity — claimed vs actual
| Pillar | Claimed | Actual | Last check |
| --- | --- | --- | --- |
| Application control | ML2 | ML1 | Feb 2026 internal |
| MFA | ML2 | ML2 | IRAP 2024-08 |
| Patch applications | ML2 | ML2 | Rolling SOC telemetry |
| Restrict admin privileges | ML2 | ML1 | Feb 2026 internal — break-glass accounts not expiring |
| (other pillars not yet measured) | ML2 | unknown | — |

## 3. Open IRAP findings
| Ref | Area | Severity | Opened | ETA |
| --- | --- | --- | --- | --- |
| FIND-2024-007 | Identity — break-glass | Medium | 2024-08 | Remediation in flight, Q3 2026 |
| FIND-2024-011 | Logging retention | Low | 2024-08 | Contract renewal blocked |

## 4. Top open risks
- Shared log-retention gap — vendor upgrade blocked
- Application control ML2 claim not matched by engineering reality
- Third-party CI/CD signing key not rotated on schedule

## 5. Known weaknesses
- App control at ML1 in production, compensated by EDR + tight change mgmt.
- Logging retention 7 months, SSP-A claims 12.

## 6. Platform vs product
- Platform-evidenced: hypervisor, DC physical, regional failover.
- Claimed platform, actually product: app-level logging, session mgmt.
- Shared: identity (Azure AD tenant + product-side conditional access).

## 7. Last pen-test
- Date: 2025-11
- Scope: external web + API
- Top open: two informational findings on error verbosity.

## 8. In-flight uplift
- Phishing-resistant MFA rollout — complete end-Q3 2026.
- Log-retention vendor swap — RFP closed, integration Q4.

## 9. Unusual
- Federal-only tenancy; no state-government callers.

## 10. Authored by
- Author: Gaurav Vikash, Platform Security
- Date: 2026-04-21
- Confidence: medium (E8 actuals on 5 of 8 pillars only)
```

---

## If the operator supplies no posture brief at all

Claude should:

1. **Produce the review anyway.** Don't block — a priorityless review is
   worse than an abstract-priority review.
2. **Emit the abstract-priority disclaimer** at the top of the priority
   section (see `OUTPUT_TEMPLATE.md §3`): "*Priorities reflect the control
   change against classification and E8 claim only. No current-posture
   input was supplied; P0 / P1 buckets may be over- or under-stated for
   this product's actual security state. The reviewer should reconcile
   against their own posture knowledge before circulating.*"
3. **Ask once** at the end: "*Want me to re-run the priority inference if
   you supply a posture brief? There's a template in
   POSTURE_BRIEF_TEMPLATE.md.*" Do not pester.

## If the brief is partial

- Honour what's there, note the missing sections explicitly in the output
  under "Posture inputs used / missing".
- Do not interpolate across sections. "No pen-test data" does not mean
  "assume pen-test coverage is good".

---

*Maintained by Gaurav Vikash — [LinkedIn](https://www.linkedin.com/in/gauravvikash/). Part of the
ISM Quarterly Review Claude Project pack.*
