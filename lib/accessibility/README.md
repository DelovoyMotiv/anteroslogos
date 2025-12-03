# Keyboard Accessibility Implementation

**Property 30: Keyboard Accessibility - Validates Requirements 6.5**

This module provides comprehensive keyboard accessibility utilities and React hooks to ensure all interactive elements in the application are keyboard accessible.

## Features

- ✅ Focus trap for modals and dialogs
- ✅ Roving tabindex for lists and grids
- ✅ ARIA live region announcements
- ✅ Keyboard event helpers
- ✅ React hooks for common patterns
- ✅ Skip links for navigation
- ✅ Focus management utilities

## Core Utilities

### FocusTrap

Traps keyboard focus within a container, essential for modal dialogs and overlays.

```typescript
import { FocusTrap } from '@/lib/accessibility/keyboardNav';

const container = document.getElementById('modal');
const focusTrap = new FocusTrap(container);

// Activate trap
focusTrap.activate();

// Deactivate and restore focus
focusTrap.deactivate();
```

### RovingTabIndex

Implements roving tabindex pattern for lists, grids, and toolbars. Only one item is in tab order at a time, arrow keys move focus.

```typescript
import { RovingTabIndex } from '@/lib/accessibility/keyboardNav';

const list = document.getElementById('menu');
const roving = new RovingTabIndex(list, 'vertical');

// Supports: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, End
```

### Announce

Announces messages to screen readers using ARIA live regions.

```typescript
import { announce } from '@/lib/accessibility/keyboardNav';

// Polite announcement (doesn't interrupt)
announce('Item added to cart');

// Assertive announcement (interrupts)
announce('Error: Form submission failed', 'assertive');
```

### Keyboard Event Helpers

```typescript
import {
  isEnterKey,
  isSpaceKey,
  isEscapeKey,
  isActivationKey,
} from '@/lib/accessibility/keyboardNav';

element.addEventListener('keydown', (e) => {
  if (isActivationKey(e)) {
    // Handle Enter or Space
    handleClick();
  }
  if (isEscapeKey(e)) {
    // Handle Escape
    closeModal();
  }
});
```

### makeKeyboardAccessible

Makes any element keyboard accessible by adding proper attributes and event handlers.

```typescript
import { makeKeyboardAccessible } from '@/lib/accessibility/keyboardNav';

const div = document.getElementById('clickable-div');
makeKeyboardAccessible(div, handleClick, 'button');

// Now the div:
// - Has role="button"
// - Has tabindex="0"
// - Responds to click, Enter, and Space
```

## React Hooks

### useFocusTrap

Trap focus within a component (for modals, dialogs).

```tsx
import { useFocusTrap } from '@/lib/accessibility/hooks';

function Modal({ isOpen, onClose }) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      <h2>Modal Title</h2>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### useEscapeKey

Handle Escape key press.

```tsx
import { useEscapeKey } from '@/lib/accessibility/hooks';

function Sidebar({ isOpen, onClose }) {
  useEscapeKey(onClose, isOpen);

  return <aside>{/* sidebar content */}</aside>;
}
```

### useAnnounce

Announce messages to screen readers.

```tsx
import { useAnnounce } from '@/lib/accessibility/hooks';

function Form() {
  const announce = useAnnounce();

  const handleSubmit = async () => {
    try {
      await submitForm();
      announce('Form submitted successfully');
    } catch (error) {
      announce('Error submitting form', 'assertive');
    }
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

### useAutoFocus

Automatically focus an element on mount.

```tsx
import { useAutoFocus } from '@/lib/accessibility/hooks';

function SearchModal({ isOpen }) {
  const inputRef = useAutoFocus(isOpen);

  return (
    <div>
      <input ref={inputRef} type="search" placeholder="Search..." />
    </div>
  );
}
```

### useAccessibleButton

Make a non-button element behave like a button.

```tsx
import { useAccessibleButton } from '@/lib/accessibility/hooks';

function Card({ onClick }) {
  const buttonProps = useAccessibleButton(onClick);

  return (
    <div {...buttonProps} className="card">
      <h3>Card Title</h3>
      <p>Card content</p>
    </div>
  );
}
```

### useRovingTabIndex

Implement roving tabindex for lists.

```tsx
import { useRovingTabIndex } from '@/lib/accessibility/hooks';

function Menu({ items }) {
  const containerRef = useRovingTabIndex('vertical');

  return (
    <ul ref={containerRef} role="menu">
      {items.map((item) => (
        <li key={item.id} role="menuitem" tabIndex={-1}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

## Component Updates

The following components have been updated with keyboard accessibility:

### UIStates Components

- **LoadingState**: Added `role="status"` and `aria-live="polite"`
- **ErrorState**: Added `role="alert"` and `aria-live="assertive"`
- **EmptyState**: Added `role="status"` and `aria-live="polite"`
- **All buttons**: Added focus rings and ARIA labels

### TracerViz

- All control buttons have ARIA labels
- SVG has descriptive `role="img"` and `aria-label`
- Toolbar has `role="toolbar"`
- Focus indicators on all interactive elements

### Tooltip & Disclosure

- Disclosure buttons have `aria-expanded` and `aria-controls`
- Content regions have proper IDs and `role="region"`
- Focus indicators on all interactive elements

### UIStatesDemo

- Tab buttons have `role="tab"` and `aria-selected`
- Tab panels have corresponding `aria-controls`
- Focus indicators on all tabs

## Keyboard Navigation Patterns

### Modal Dialogs

```tsx
function Modal({ isOpen, onClose }) {
  const containerRef = useFocusTrap(isOpen);
  useEscapeKey(onClose, isOpen);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">Modal Title</h2>
      <button onClick={onClose} aria-label="Close modal">
        ×
      </button>
      {/* modal content */}
    </div>
  );
}
```

### Lists with Roving Tabindex

```tsx
function NavigationMenu({ items }) {
  const containerRef = useRovingTabIndex('vertical');

  return (
    <nav ref={containerRef} role="navigation">
      <ul role="menu">
        {items.map((item, index) => (
          <li
            key={item.id}
            role="menuitem"
            tabIndex={index === 0 ? 0 : -1}
            data-roving-item
          >
            {item.label}
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Buttons with Loading States

```tsx
function SubmitButton({ isLoading, onClick }) {
  const announce = useAnnounce();

  const handleClick = () => {
    onClick();
    announce('Submitting form...');
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label={isLoading ? 'Submitting...' : 'Submit form'}
    >
      {isLoading ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

## Testing

### Property-Based Tests

Located in `__tests__/keyboardNav.property.test.ts`, these tests verify:

- Focus trap maintains focus within container for any number of elements
- Roving tabindex maintains exactly one tabbable element
- Announce creates live regions for any message
- Keyboard event helpers correctly identify keys
- makeKeyboardAccessible works for any element type

### Unit Tests

Located in `__tests__/keyboardNav.test.ts`, these tests verify:

- Focus trap activation and deactivation
- Roving tabindex navigation with arrow keys
- ARIA live region creation and updates
- Focusable element detection
- Keyboard event helper functions

### Integration Tests

Located in `__tests__/hooks.test.tsx`, these tests verify:

- React hooks work correctly in components
- Focus management in real component scenarios
- Event handling with user interactions

## Best Practices

### 1. Always Provide Focus Indicators

```css
/* Good */
button:focus {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}

/* Better - using focus-visible */
button:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}
```

### 2. Use Semantic HTML

```tsx
/* Good */
<button onClick={handleClick}>Click me</button>

/* Avoid */
<div onClick={handleClick}>Click me</div>
```

### 3. Provide ARIA Labels

```tsx
/* Good */
<button aria-label="Close modal" onClick={onClose}>
  <X />
</button>

/* Avoid */
<button onClick={onClose}>
  <X />
</button>
```

### 4. Manage Focus on Route Changes

```tsx
function App() {
  const location = useLocation();

  useEffect(() => {
    // Focus main content on route change
    const main = document.getElementById('main-content');
    main?.focus();
  }, [location]);

  return <main id="main-content" tabIndex={-1}>{/* content */}</main>;
}
```

### 5. Announce Dynamic Content Changes

```tsx
function DataTable({ data, isLoading }) {
  const announce = useAnnounce();

  useEffect(() => {
    if (!isLoading && data) {
      announce(`Loaded ${data.length} items`);
    }
  }, [isLoading, data, announce]);

  return <table>{/* table content */}</table>;
}
```

## Screen Reader Testing

Test with actual screen readers:

- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca
- **Mobile**: TalkBack (Android), VoiceOver (iOS)

### Common Screen Reader Commands

**NVDA/JAWS:**
- Navigate: Arrow keys
- Read all: Insert + Down arrow
- Next heading: H
- Next button: B
- Next form field: F

**VoiceOver (macOS):**
- Navigate: VO + Arrow keys (VO = Control + Option)
- Read all: VO + A
- Next heading: VO + Command + H
- Rotor: VO + U

## Compliance

This implementation ensures compliance with:

- **WCAG 2.1 Level AA**: All keyboard accessibility criteria
- **Section 508**: Keyboard operation requirements
- **ARIA 1.2**: Proper use of ARIA roles and properties

## References

- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
