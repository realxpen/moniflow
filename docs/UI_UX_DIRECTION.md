# MONIFlow UI/UX Direction

## Source of truth

The supplied MONIFlow moodboard is the visual reference for the hackathon MVP. It shows warm ivory and pale-lilac canvases, oversized editorial type, fine technical dot/mono labels, softly blurred natural imagery, deep charcoal controls, large rounded modules, restrained frosted glass, compact pills, and generous negative space.

This document translates those characteristics into implementation rules. It does not authorize product features beyond `MONIFLOW_PRODUCT_SOURCE.md`.

## Design idea: Calm Financial Intelligence

MONIFlow should feel premium, calm, intelligent, trustworthy, editorial, modern, financial, and human-controlled. The interface should make complex money operations understandable without making them feel casual.

It must not resemble a generic fintech dashboard, crypto terminal, neon Web3 product, chatbot transcript, science-fiction robot interface, or template admin panel.

## Moodboard interpretation

- Use a quiet canvas with one dominant idea per surface.
- Pair spacious editorial headlines with compact technical state labels.
- Let soft lavender, ivory, and organic muted tones carry the atmosphere.
- Use blurred or translucent depth mainly around intelligence and focus moments.
- Use black/charcoal sparingly for consequential actions and high-clarity controls.
- Prefer large rounded cards and small floating pills over dense grids.
- Keep motion slow enough to feel deliberate and fast enough to preserve trust.

The moodboard is inspiration, not permission to copy its content, logos, imagery, or product structure.

## Foundations

### Backgrounds

Prefer warm ivory, off-white, pale lavender, and soft gray-lilac. Avoid pure white as the universal background. Tonal changes should be subtle and should help separate modes or sections rather than decorate empty space.

### Surfaces

Use softly elevated cards, rounded modules, subtle borders, and occasional translucent/frosted surfaces. Glass is purposeful: operator input, processing, and Money Plan focus states may use it; ordinary settings, lists, and safety checks generally should not.

### Shape

- Primary card radius: 32
- Secondary card radius: 22–28
- Controls and status chips: full pills
- Borders: one-pixel, low-contrast, never glowing

### Typography roles

**Editorial typography** is for large money amounts, page headings, operator commands, major cards, and result states. It should be confident, spacious, and readable. The first implementation uses the platform system sans and can later adopt a licensed display family after performance and licensing review.

**Technical typography** is for `MONI GUARD`, `CNGN`, `PROCESSING`, `VERIFIED`, wallet states, tiny system labels, and metadata. Use a restrained mono treatment with uppercase text and moderate letter spacing. It is a signal of system state, not a decorative font for paragraphs.

## Semantic color tokens

| Token | Phase 2 value | Purpose |
|---|---:|---|
| `background-primary` | `#F6F2EA` | Main warm ivory canvas |
| `background-secondary` | `#EEE8F1` | Pale gray-lilac alternate canvas |
| `surface` | `#FCFAF5` | Opaque cards and controls |
| `surface-glass` | `rgba(255,252,247,0.70)` | Restrained frosted surface |
| `text-primary` | `#19181B` | Primary copy and amounts |
| `text-secondary` | `#716D75` | Supporting copy and metadata |
| `border-soft` | `rgba(50,45,55,0.10)` | Quiet separation |
| `status-success` | `#47715A` | Verified financial success |
| `status-warning` | `#9A6B25` | Review and caution |
| `status-error` | `#A24F4F` | Failed or blocked states |
| `status-processing` | `#69608D` | In-progress system states |
| `accent-primary` | `#8270A0` | Selective intelligence accent |

Success uses a subtle financial green, warnings use controlled amber, and failures use muted but obvious red. Bright neon colors are prohibited.

## Product modes

### Calm Mode

Used for Home, Pockets, and Activity. Use opaque soft surfaces, generous spacing, quiet hierarchy, and minimal blur.

### Intelligence Mode

Used for operator input, parsing, and the Money Plan. Use selective translucent surfaces, layered tonal depth, and focused command typography. Do not show hidden chain-of-thought; show only understandable process states.

### Safety Mode

Used for MONI Guard. Use structured rows, technical labels, explicit pass/review/block indicators, and auditable messages. Clarity outranks atmosphere.

### Consequence Mode

Used for financial authorization. Reduce decoration, increase contrast, and make amount, destination, fees when known, and balance consequence dominant. Approval must feel serious and explicit.

## Token scales

### Spacing

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Radius

`10, 16, 22, 28, 32, pill`

### Motion

| Token | Duration | Use |
|---|---:|---|
| `instant` | 100 ms | Press feedback |
| `quick` | 180 ms | Pills and compact state changes |
| `standard` | 280 ms | Cards and navigation continuity |
| `deliberate` | 420 ms | Important process/result transitions |

Motion must never disguise a status, delay access to approval details, or imply success before provider verification. The implementation respects the platform reduced-motion preference.

## Foundational components

Phase 2 provides:

- foundations: `Screen`, `SoftCard`, `GlassCard`, `PrimaryButton`, `SecondaryButton`, `Pill`, `StatusPill`, `MoneyText`, and `SectionTitle`;
- operator and process: `OperatorInput`, `SuggestionChip`, and `ProgressStep`;
- safety and approval: `GuardCheck`, `BottomSheet`, and `ConfirmationButton`;
- financial composition: `BalanceCard`, `PocketCard`, and `ActivityRow`;
- motion primitive: `AnimatedEntry`.

The private `/_dev/design-system` route is the Phase 2 component showcase. It is intentionally outside the permanent tab bar and uses clearly labeled mock data. New primitives should be added only when a real product screen creates a repeated need.

## Motion behavior

- Cards use a subtle fade-and-rise entry.
- Processing dots pulse without implying success.
- Operator focus expands the command area slightly.
- Plan and Guard rows can enter sequentially with bounded delays.
- Explicit confirmation provides brief device vibration feedback.
- Consequence Mode avoids decorative or looping motion around authorization.
- Reduced-motion mode removes entry and status animation while preserving state clarity.

## Content and trust rules

- Label mock values and demo-only state clearly.
- Never use celebratory success visuals before provider verification.
- Keep technical metadata available without making the main flow feel like a developer console.
- Use plain language for consequences and exact language for states.
- Amount and destination changes must visibly invalidate prior approval in the later approval implementation.

## Accessibility baseline

- Maintain readable contrast on every tonal or glass surface.
- Do not encode success, warning, or failure by color alone.
- Use at least 44×44 touch targets.
- Support Dynamic Type where layouts allow; never shrink critical financial information to fit.
- Provide explicit accessibility labels for icon-only controls when icons are introduced.
- Blur and translucency must retain an opaque-enough fallback for readability.
