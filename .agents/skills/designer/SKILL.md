---
name: designer
description: UI components and styling for creator-station. Use when building or modifying UI in apps/creator-station.
---

# Request Clarity

**Ambiguous requests require clarification.** Ask for:
- **What** — Which component or element
- **Where** — Confirm file path or page section
- **How** — Desired visual outcome

❌ "Make it look better" → ✅ "Change the New Quest button variant from `cyan` to `green`"

---

# Quick Reference

## Colors (use tokens, not hex)

| Token | Usage |
|-------|-------|
| `navy-deep` | Page background |
| `panel` | Card backgrounds |
| `panel-border` | Borders, dividers |
| `cyan` | Primary accent, focus |
| `neon-green` | Success |
| `hot-pink` | Emphasis, alerts |
| `yellow` | Warnings |

## Text Opacity

`text-white` → `text-white/70` (muted) → `text-white/50` (dim) → `text-white/30` (ghost)

## Typography

- **Headings/buttons:** `font-bangers`
- **Code/screenplay:** `font-courier`

---

# Components

Import from `components/ui`:

```jsx
import { Button, Badge, Card, Input, Tabs, Modal } from '../../components/ui';
```

| Component | Key Props | Example |
|-----------|-----------|---------|
| `Button` | `variant`, `size` | `<Button variant="cyan" size="md">` |
| `Badge` | `variant` | `<Badge variant="green-solid">` |
| `Card` | `hover`, `onClick` | `<Card hover className="p-4">` |
| `Input` | `label`, `error` | `<Input label="Name" />` |
| `Tabs` | `defaultValue` or `value`+`onValueChange` | See below |

**Button variants:** `cyan`, `green`, `pink`, `yellow`, `purple`, `orange`, `ghost`, `danger` (+ `-outline` versions)

**Badge variants:** `cyan`, `green`, `pink`, `yellow`, `purple`, `orange`, `gray` (+ `-solid` versions)

---

# Layout Patterns

## Page Structure
```jsx
<div className="p-6 max-w-7xl mx-auto">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">...</div>
  <div className="flex items-center justify-between mb-6">
    <h2 className="font-bangers text-2xl text-white">Title</h2>
    <Button>Action</Button>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">...</div>
</div>
```

## Empty State
```jsx
<div className="text-center py-16">
  <Icon className="w-16 h-16 text-white/30 mx-auto mb-4" />
  <h3 className="font-bangers text-xl text-white mb-2">Title</h3>
  <p className="text-white/70 mb-6">Description</p>
  <Button>CTA</Button>
</div>
```

## Icon Sizes (lucide-react)
`w-3 h-3` (inline) → `w-4 h-4` (buttons) → `w-5 h-5` (medium) → `w-6 h-6` (cards) → `w-16 h-16` (empty states)

---

# Anti-Patterns

- **Raw hex colors** — Use tokens: `text-cyan`, `bg-panel`
- **`rounded-md` for panels** — Use `rounded-panel`
- **Duplicate components** — Check `components/ui/` first
- **Inline styles** — Use Tailwind classes