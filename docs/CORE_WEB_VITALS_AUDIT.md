# Core Web Vitals Audit Report
**Project:** Anóteros Lógos Agency Website  
**Date:** November 1, 2025  
**Audit Scope:** LCP, CLS, INP optimization analysis

---

## Executive Summary

Current build analysis reveals several critical areas requiring optimization to meet Core Web Vitals targets:
- **LCP Target:** < 2.5s (Currently at risk: 380KB JS bundle)
- **CLS Target:** < 0.1 (Currently at risk: font loading, animations)
- **INP Target:** < 200ms (Currently at risk: heavy canvas animations)

**Overall Risk Level:** HIGH - Immediate optimizations required

---

## 1. Bundle Size Analysis

### Current Build Output
```
dist/assets/index-Du9_kBN-.css         44.93 kB │ gzip:   7.42 kB
dist/assets/react-vendor-B_uAldPx.js   11.18 kB │ gzip:   3.95 kB
dist/assets/index-CJIpGDu-.js         380.25 kB │ gzip: 106.89 kB ⚠️ CRITICAL
```

### Issues Identified
1. **Main bundle is 380KB (107KB gzipped)** - This is EXCESSIVE for initial load
   - React Router DOM and all page components are bundled together
   - No route-based code splitting implemented
   - Target should be < 50KB gzipped for initial bundle

2. **Single monolithic bundle** - All routes load simultaneously
   - HomePage, KnowledgeBasePage, PrivacyPolicy, CookiePolicy all in one chunk
   - Users download code for pages they may never visit

### Impact on LCP
- **Estimated LCP:** 3.5-5s on 3G connections
- **Risk Level:** CRITICAL

---

## 2. JavaScript Performance (INP)

### Heavy Components Identified

#### DigitalBackground.tsx - CRITICAL ISSUE
```typescript
- Canvas animation running on every frame (requestAnimationFrame)
- 50 particles on desktop, 25 on mobile (still too many)
- Scroll event listener with parallax calculations
- No throttling or performance budgeting
```

**Impact:** 
- Continuous main thread blocking
- INP likely > 300ms during scrolling
- Battery drain on mobile devices

#### AnimatedSection.tsx - MODERATE ISSUE
```typescript
- IntersectionObserver on every section (good approach)
- Multiple simultaneous transitions with staggered delays
- Translate/opacity transforms (relatively performant)
```

**Impact:**
- Moderate INP impact when multiple sections intersect
- Can cause jank on lower-end devices

### Third-Party Scripts
- **Google Fonts:** 4 font families with multiple weights
  - DM Sans: 4 weights
  - Inter: 3 weights
  - Space Grotesk: 3 weights
  - JetBrains Mono: 2 weights
  - Total font data: ~150KB

---

## 3. Font Loading Strategy (CLS)

### Current Implementation
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="...Google Fonts CSS">
<link rel="stylesheet" media="print" onload="this.media='all'">
```

### Issues
1. **Async font loading causes FOIT (Flash of Invisible Text)**
   - Text invisible until fonts load
   - CLS when fonts swap in
   - Estimated CLS: 0.15-0.25

2. **Too many font families and weights**
   - 4 families, 12 total weights
   - Excessive HTTP requests
   - Large cumulative download size

3. **No font-display strategy**
   - Should use `font-display: swap` or `optional`
   - No fallback system fonts properly sized

### Impact on CLS
- **Estimated CLS:** 0.15-0.25 (POOR)
- **Risk Level:** HIGH

---

## 4. Layout Stability (CLS)

### Potential CLS Issues

1. **Font Loading** (Primary Issue)
   - System fonts vs. loaded fonts have different metrics
   - Hero section text shift during font swap
   - No size-adjust or fallback matching

2. **AnimatedSection Transforms**
   - `translate-y-8` to `translate-y-0` transitions
   - Using transforms (good), but opacity changes still occur
   - Minimal CLS impact if properly implemented

3. **Dynamic Content**
   - No unsized images detected (good - only SVG icons)
   - All content appears to be statically rendered
   - Canvas element uses fixed positioning (good)

### Measured Risk Areas
- Hero section: HIGH (large fonts, animations)
- Trust bar: MEDIUM (delayed animation)
- Other sections: LOW

---

## 5. Image Optimization

### Current Status
✅ **No raster images detected** - Only SVG icons used
✅ **No lazy loading required** - All content is SVG or CSS-based
✅ **No LCP impact from images**

**Status:** EXCELLENT - No action required

---

## 6. CSS Performance

### Current Build
```
dist/assets/index-Du9_kBN-.css: 44.93 kB │ gzip: 7.42 kB
```

### Analysis
- **Size is acceptable** for a full-featured site
- Using Tailwind CSS (optimized with PurgeCSS via PostCSS)
- No obvious bloat detected

**Status:** GOOD - Minor optimization opportunity

---

## Critical Recommendations

### Priority 1: Bundle Size Reduction (LCP)

#### 1.1 Implement Route-Based Code Splitting
```typescript
// App.tsx - Use React.lazy()
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('./pages/HomePage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));

// Wrap routes in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<HomePage />} />
    ...
  </Routes>
</Suspense>
```

**Expected Impact:**
- Initial bundle: 380KB → 80-120KB
- LCP improvement: 2-3 seconds
- **Priority: CRITICAL**

#### 1.2 Optimize Vite Bundle Configuration
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'router': ['react-router-dom'],
        'knowledge-base': ['./data/geoKnowledgeBase'],
      },
    },
  },
  chunkSizeWarningLimit: 100,
}
```

#### 1.3 Add Critical CSS Inlining
- Extract above-the-fold CSS
- Inline critical styles in `<head>`
- Defer non-critical CSS

**Expected Impact:**
- LCP improvement: 0.5-1 second
- **Priority: HIGH**

---

### Priority 2: JavaScript Performance (INP)

#### 2.1 Optimize DigitalBackground Canvas
```typescript
// DigitalBackground.tsx improvements
const DigitalBackground: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Only run animation when in viewport
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });
    
    observer.observe(canvasRef.current);
    
    // Throttle to 30fps instead of 60fps
    let lastTime = 0;
    const fps = 30;
    const interval = 1000 / fps;
    
    const animate = (currentTime: number) => {
      if (!isVisible) return;
      
      if (currentTime - lastTime >= interval) {
        // Animation logic
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
  }, [isVisible]);
  
  // Reduce particle count
  const particleCount = window.innerWidth > 768 ? 30 : 15; // Reduced from 50/25
};
```

#### 2.2 Debounce Scroll Handler
```typescript
// Use requestAnimationFrame for scroll throttling
const handleScroll = () => {
  if (!rafId.current) {
    rafId.current = requestAnimationFrame(() => {
      scrollY.current = window.scrollY;
      rafId.current = null;
    });
  }
};
```

#### 2.3 Consider Removing Canvas Entirely
- Background animations provide minimal UX value
- Significant performance cost
- Consider replacing with static CSS gradients/effects

**Expected Impact:**
- INP improvement: 100-200ms
- Battery life improvement on mobile
- **Priority: HIGH**

---

### Priority 3: Font Loading (CLS)

#### 3.1 Self-Host Fonts
```bash
# Download and self-host Google Fonts
# Use fontsource or google-webfonts-helper
npm install @fontsource/dm-sans @fontsource/inter @fontsource/space-grotesk
```

```typescript
// Import only needed weights in index.tsx
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
```

**Benefits:**
- Eliminate external HTTP requests
- Better caching control
- Reduce font loading time by 50%

#### 3.2 Add font-display Strategy
```css
/* Add to global CSS */
@font-face {
  font-family: 'DM Sans';
  font-display: swap; /* Show fallback immediately, swap when loaded */
  /* or */
  font-display: optional; /* Use fallback if font takes > 100ms */
}
```

#### 3.3 Reduce Font Weights
```typescript
// Current: 12 font weights across 4 families
// Target: 6 font weights across 2-3 families

// Keep only:
// - DM Sans: 400, 600, 700
// - Inter: 400, 600
// - Space Grotesk: 600 (for headings only)
// Remove: JetBrains Mono (minimal usage)
```

#### 3.4 Size-Adjust Fallbacks
```css
/* Match fallback font metrics to loaded fonts */
@font-face {
  font-family: 'DM Sans Fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 95%;
  descent-override: 25%;
  line-gap-override: 0%;
}

body {
  font-family: 'DM Sans', 'DM Sans Fallback', system-ui, sans-serif;
}
```

**Expected Impact:**
- CLS improvement: 0.15 → 0.05
- LCP improvement: 0.3-0.5 seconds
- **Priority: CRITICAL**

---

### Priority 4: Animation Performance

#### 4.1 Use CSS Containment
```css
/* Add to AnimatedSection wrapper */
.animated-section {
  contain: layout style paint;
  will-change: transform, opacity;
}

/* Remove will-change after animation completes */
.animated-section.animation-complete {
  will-change: auto;
}
```

#### 4.2 Reduce Simultaneous Animations
```typescript
// Limit to 3-4 sections animating at once
// Add intersection observer with threshold
rootMargin: '100px 0px -100px 0px' // Smaller window
```

**Expected Impact:**
- Smoother scrolling
- Lower INP during page load
- **Priority: MEDIUM**

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Implement route-based code splitting
- [ ] Self-host fonts and add font-display
- [ ] Reduce font families and weights
- [ ] Optimize or remove DigitalBackground canvas

**Expected Results:**
- LCP: < 2.5s
- CLS: < 0.1
- INP: < 200ms

### Phase 2: Advanced Optimizations (Week 2)
- [ ] Add critical CSS inlining
- [ ] Implement font size-adjust fallbacks
- [ ] Add CSS containment to animated sections
- [ ] Optimize bundle chunking strategy

**Expected Results:**
- LCP: < 2.0s
- CLS: < 0.05
- INP: < 150ms

### Phase 3: Monitoring (Ongoing)
- [ ] Set up Lighthouse CI in GitHub Actions
- [ ] Add real user monitoring (RUM) with web-vitals library
- [ ] Configure performance budgets in Vite
- [ ] Regular audits after content updates

---

## Performance Budget Recommendations

```javascript
// vite.config.ts
build: {
  chunkSizeWarningLimit: 100, // 100KB limit per chunk
  rollupOptions: {
    output: {
      experimentalMinChunkSize: 20 * 1024, // 20KB min
    }
  }
}
```

### Budgets by Metric
- **LCP:** < 2.5s (Good), < 4.0s (Needs Improvement)
- **CLS:** < 0.1 (Good), < 0.25 (Needs Improvement)
- **INP:** < 200ms (Good), < 500ms (Needs Improvement)
- **Initial Bundle Size:** < 50KB gzipped
- **Total Bundle Size:** < 200KB gzipped
- **Font Load Time:** < 500ms
- **Main Thread Blocking:** < 300ms

---

## Testing Strategy

### 1. Local Testing
```bash
# Build and analyze
npm run build

# Use Lighthouse CLI
npx lighthouse https://localhost:4173 --view

# Use bundle analyzer
npm install -D rollup-plugin-visualizer
```

### 2. Real Device Testing
- Test on actual 3G connections
- Test on low-end Android devices (Samsung Galaxy A series)
- Test on throttled CPU (4x slowdown in DevTools)

### 3. Continuous Monitoring
```bash
# Install web-vitals
npm install web-vitals

# Add to index.tsx
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(console.log);
onFID(console.log);
onLCP(console.log);
```

---

## Expected Outcomes

### Before Optimization
- **LCP:** ~4.5s (Poor)
- **CLS:** ~0.20 (Poor)
- **INP:** ~350ms (Poor)
- **Performance Score:** ~55/100

### After Phase 1
- **LCP:** ~2.3s (Good)
- **CLS:** ~0.08 (Good)
- **INP:** ~180ms (Good)
- **Performance Score:** ~85/100

### After Phase 2
- **LCP:** ~1.8s (Excellent)
- **CLS:** ~0.04 (Excellent)
- **INP:** ~120ms (Excellent)
- **Performance Score:** ~95/100

---

## Additional Resources

- [Web.dev Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI Setup](https://github.com/GoogleChrome/lighthouse-ci)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Font Loading Best Practices](https://web.dev/font-best-practices/)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Containment)

---

## Conclusion

The site has strong SEO foundations and excellent structured data, but Core Web Vitals need immediate attention. The primary bottlenecks are:

1. **Massive JavaScript bundle** (380KB) - needs route splitting
2. **Heavy canvas animations** - needs optimization or removal
3. **External font loading** - needs self-hosting and font-display strategy

All identified issues are fixable within 1-2 weeks. Following the phased roadmap will bring the site to excellent Core Web Vitals scores, ensuring strong performance for both users and AI crawlers.
