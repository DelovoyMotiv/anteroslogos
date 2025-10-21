// Browser Console Test Script
// Paste this in DevTools Console to verify all elements

console.log('🔍 Starting Visual Audit...\n');

const tests = {
  header: () => {
    const header = document.querySelector('header');
    const logo = document.querySelector('header svg');
    const title = document.querySelector('header span');
    return {
      'Header exists': !!header,
      'Logo SVG exists': !!logo,
      'Title text exists': !!title,
      'Header has fixed position': header && getComputedStyle(header).position === 'fixed'
    };
  },
  
  hero: () => {
    const hero = document.querySelector('section h1');
    const button = document.querySelector('section button');
    const scrollIndicator = document.querySelector('.animate-scroll-indicator');
    return {
      'Hero H1 exists': !!hero,
      'Hero H1 text correct': hero && hero.textContent.includes("Don't rank"),
      'CTA button exists': !!button,
      'Scroll indicator exists': !!scrollIndicator
    };
  },
  
  canvas: () => {
    const canvas = document.querySelector('canvas');
    return {
      'Canvas exists': !!canvas,
      'Canvas has fixed position': canvas && getComputedStyle(canvas).position === 'fixed',
      'Canvas width set': canvas && canvas.width > 0,
      'Canvas height set': canvas && canvas.height > 0
    };
  },
  
  sections: () => {
    const sections = document.querySelectorAll('section');
    const drawLines = document.querySelectorAll('.draw-line-container');
    return {
      'Total sections': sections.length,
      'Draw-line containers': drawLines.length,
      'TheShift section exists': !!document.body.textContent.includes('The Paradigm Shift'),
      'Philosophy section exists': !!document.body.textContent.includes('Beyond Marketing'),
      'Nicosia section exists': !!document.body.textContent.includes('The Nicosia Method'),
      'Client Profile section exists': !!document.body.textContent.includes('Who We Partner With')
    };
  },
  
  fonts: () => {
    const h1 = document.querySelector('h1');
    const body = document.body;
    const mono = document.querySelector('.font-mono');
    return {
      'H1 font-family includes Cormorant': h1 && getComputedStyle(h1).fontFamily.includes('Cormorant'),
      'Body font-family includes Inter': getComputedStyle(body).fontFamily.includes('Inter'),
      'Mono element exists': !!mono
    };
  },
  
  icons: () => {
    const icons = document.querySelectorAll('svg:not(canvas)');
    return {
      'Total SVG icons': icons.length,
      'Logo icon': !!document.querySelector('header svg'),
      'Method icons': document.querySelectorAll('section svg').length
    };
  },
  
  modal: () => {
    const modal = document.querySelector('[role="dialog"]');
    return {
      'Modal exists in DOM': !!modal,
      'Modal currently visible': modal && getComputedStyle(modal).display !== 'none'
    };
  },
  
  footer: () => {
    const footer = document.querySelector('footer');
    const copyright = footer && footer.textContent.includes('2025');
    return {
      'Footer exists': !!footer,
      'Copyright text present': copyright
    };
  }
};

// Run all tests
Object.keys(tests).forEach(testName => {
  console.log(`\n📋 ${testName.toUpperCase()}`);
  const results = tests[testName]();
  Object.entries(results).forEach(([key, value]) => {
    const icon = value === true || (typeof value === 'number' && value > 0) ? '✅' : '❌';
    console.log(`${icon} ${key}:`, value);
  });
});

console.log('\n✨ Audit Complete!\n');

// Check for console errors
console.log('🔍 Checking for errors...');
const errors = window.__errors || [];
console.log(errors.length === 0 ? '✅ No errors found' : `⚠️ ${errors.length} errors found`);
