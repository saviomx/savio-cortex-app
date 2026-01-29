import { chromium, Page, Browser, ConsoleMessage } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface UIIssue {
  type: 'accessibility' | 'performance' | 'layout' | 'console' | 'ux' | 'responsive';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  element?: string;
  suggestion: string;
}

interface PageAnalysis {
  url: string;
  title: string;
  issues: UIIssue[];
  metrics: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
  };
  screenshots: string[];
}

const BASE_URL = 'http://localhost:4000';
const OUTPUT_DIR = './ui-analysis-results';

async function analyzeAccessibility(page: Page): Promise<UIIssue[]> {
  const issues: UIIssue[] = [];

  // Check for images without alt text
  const imagesWithoutAlt = await page.$$eval('img:not([alt]), img[alt=""]', (imgs) =>
    imgs.map((img) => ({
      src: img.getAttribute('src') || 'unknown',
      tagName: img.tagName,
    }))
  );

  for (const img of imagesWithoutAlt) {
    issues.push({
      type: 'accessibility',
      severity: 'warning',
      description: `Image missing alt text: ${img.src}`,
      element: `<img src="${img.src}">`,
      suggestion: 'Add descriptive alt text to all images for screen readers',
    });
  }

  // Check for buttons without accessible names
  const buttonsWithoutNames = await page.$$eval(
    'button:not([aria-label]):not([aria-labelledby])',
    (buttons) =>
      buttons
        .filter((btn) => !btn.textContent?.trim())
        .map((btn) => ({
          outerHTML: btn.outerHTML.substring(0, 100),
        }))
  );

  for (const btn of buttonsWithoutNames) {
    issues.push({
      type: 'accessibility',
      severity: 'critical',
      description: 'Button without accessible name',
      element: btn.outerHTML,
      suggestion: 'Add aria-label or visible text content to buttons',
    });
  }

  // Check for links without href or with href="#"
  const emptyLinks = await page.$$eval('a[href="#"], a:not([href])', (links) =>
    links.map((link) => ({
      text: link.textContent?.trim() || 'no text',
      outerHTML: link.outerHTML.substring(0, 100),
    }))
  );

  for (const link of emptyLinks) {
    issues.push({
      type: 'accessibility',
      severity: 'warning',
      description: `Link with empty or placeholder href: "${link.text}"`,
      element: link.outerHTML,
      suggestion: 'Use proper href values or convert to button if it triggers an action',
    });
  }

  // Check for form inputs without labels
  const inputsWithoutLabels = await page.$$eval(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([aria-label]):not([aria-labelledby])',
    (inputs) =>
      (inputs as HTMLInputElement[])
        .filter((input) => {
          const id = input.id;
          if (!id) return true;
          return !document.querySelector(`label[for="${id}"]`);
        })
        .map((input) => ({
          type: input.type || 'text',
          name: input.name || 'unnamed',
          placeholder: input.placeholder || '',
        }))
  );

  for (const input of inputsWithoutLabels) {
    issues.push({
      type: 'accessibility',
      severity: 'critical',
      description: `Input field without proper label: ${input.name || input.type}`,
      element: `<input type="${input.type}" name="${input.name}">`,
      suggestion: 'Associate inputs with labels using for/id or wrap input in label element',
    });
  }

  // Check color contrast (simplified check for common issues)
  const lowContrastElements = await page.$$eval('*', (elements) => {
    const issues: Array<{ text: string; bg: string; fg: string }> = [];
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      const text = el.textContent?.trim();
      if (text && text.length < 50 && text.length > 0) {
        const bgColor = style.backgroundColor;
        const fgColor = style.color;
        // Simple check for very low contrast (white on light bg, etc.)
        if (
          (bgColor.includes('255, 255, 255') || bgColor.includes('rgb(255')) &&
          (fgColor.includes('200') || fgColor.includes('220') || fgColor.includes('240'))
        ) {
          issues.push({ text: text.substring(0, 30), bg: bgColor, fg: fgColor });
        }
      }
    }
    return issues.slice(0, 5);
  });

  for (const el of lowContrastElements) {
    issues.push({
      type: 'accessibility',
      severity: 'warning',
      description: `Potential low contrast text: "${el.text}"`,
      suggestion: 'Ensure text has sufficient contrast ratio (4.5:1 for normal text)',
    });
  }

  // Check for heading hierarchy
  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (headers) =>
    headers.map((h) => ({
      level: parseInt(h.tagName[1]),
      text: h.textContent?.trim().substring(0, 50) || '',
    }))
  );

  let prevLevel = 0;
  for (const heading of headings) {
    if (heading.level > prevLevel + 1 && prevLevel !== 0) {
      issues.push({
        type: 'accessibility',
        severity: 'warning',
        description: `Skipped heading level: jumped from h${prevLevel} to h${heading.level}`,
        element: `<h${heading.level}>${heading.text}</h${heading.level}>`,
        suggestion: 'Maintain proper heading hierarchy (h1 -> h2 -> h3, etc.)',
      });
    }
    prevLevel = heading.level;
  }

  return issues;
}

async function analyzeLayout(page: Page): Promise<UIIssue[]> {
  const issues: UIIssue[] = [];

  // Check for horizontal overflow
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  if (hasHorizontalScroll) {
    issues.push({
      type: 'layout',
      severity: 'warning',
      description: 'Page has horizontal scrollbar',
      suggestion: 'Check for elements with fixed width or overflow issues',
    });
  }

  // Check for very small touch targets
  const smallTouchTargets = await page.$$eval('button, a, input, select, textarea', (elements) =>
    elements
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((el) => ({
        tagName: el.tagName,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        text: el.textContent?.trim().substring(0, 30) || '',
      }))
      .slice(0, 10)
  );

  for (const target of smallTouchTargets) {
    issues.push({
      type: 'ux',
      severity: 'info',
      description: `Small touch target (${Math.round(target.width)}x${Math.round(target.height)}px): ${target.tagName.toLowerCase()} "${target.text}"`,
      suggestion: 'Touch targets should be at least 44x44px for good mobile usability',
    });
  }

  // Check for text that might be too small
  const smallText = await page.$$eval('p, span, div, li, td, th', (elements) =>
    elements
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const text = el.textContent?.trim();
        return fontSize < 12 && text && text.length > 10;
      })
      .map((el) => ({
        text: el.textContent?.trim().substring(0, 50) || '',
        fontSize: window.getComputedStyle(el).fontSize,
      }))
      .slice(0, 5)
  );

  for (const el of smallText) {
    issues.push({
      type: 'ux',
      severity: 'info',
      description: `Very small text (${el.fontSize}): "${el.text}"`,
      suggestion: 'Consider using at least 12px font size for readability',
    });
  }

  // Check for missing focus styles
  const interactiveElements = await page.$$('button, a, input, select, textarea');
  let missingFocusStyles = 0;

  for (const el of interactiveElements.slice(0, 5)) {
    const originalOutline = await el.evaluate((e) => window.getComputedStyle(e).outline);
    await el.focus();
    const focusedOutline = await el.evaluate((e) => window.getComputedStyle(e).outline);
    const focusedBoxShadow = await el.evaluate((e) => window.getComputedStyle(e).boxShadow);

    if (
      originalOutline === focusedOutline &&
      (focusedBoxShadow === 'none' || focusedBoxShadow === '')
    ) {
      missingFocusStyles++;
    }
  }

  if (missingFocusStyles > 2) {
    issues.push({
      type: 'accessibility',
      severity: 'warning',
      description: 'Multiple interactive elements may lack visible focus indicators',
      suggestion: 'Ensure all interactive elements have visible focus states for keyboard navigation',
    });
  }

  return issues;
}

async function analyzeResponsive(page: Page, browser: Browser): Promise<UIIssue[]> {
  const issues: UIIssue[] = [];
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);

    // Check for overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasOverflow) {
      issues.push({
        type: 'responsive',
        severity: 'warning',
        description: `Horizontal overflow on ${viewport.name} (${viewport.width}px)`,
        suggestion: `Review layout for ${viewport.name} viewport to prevent horizontal scrolling`,
      });
    }

    // Check for overlapping text
    const overlappingElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const overlaps: string[] = [];

      for (let i = 0; i < elements.length && overlaps.length < 3; i++) {
        const rect1 = elements[i].getBoundingClientRect();
        if (rect1.width === 0 || rect1.height === 0) continue;

        for (let j = i + 1; j < elements.length; j++) {
          const rect2 = elements[j].getBoundingClientRect();
          if (rect2.width === 0 || rect2.height === 0) continue;

          const overlap =
            rect1.left < rect2.right &&
            rect1.right > rect2.left &&
            rect1.top < rect2.bottom &&
            rect1.bottom > rect2.top;

          if (overlap) {
            const text1 = elements[i].textContent?.trim();
            const text2 = elements[j].textContent?.trim();
            if (text1 && text2 && text1.length > 0 && text2.length > 0 && text1 !== text2) {
              // Check if one is not a child of the other
              if (
                !elements[i].contains(elements[j]) &&
                !elements[j].contains(elements[i])
              ) {
                overlaps.push(`${elements[i].tagName} overlaps ${elements[j].tagName}`);
                break;
              }
            }
          }
        }
      }
      return overlaps;
    });

    for (const overlap of overlappingElements) {
      issues.push({
        type: 'responsive',
        severity: 'info',
        description: `Possible element overlap on ${viewport.name}: ${overlap}`,
        suggestion: 'Review element positioning for this viewport size',
      });
    }
  }

  // Reset to desktop
  await page.setViewportSize({ width: 1280, height: 800 });

  return issues;
}

async function collectConsoleErrors(page: Page): Promise<UIIssue[]> {
  const issues: UIIssue[] = [];
  const consoleMessages: ConsoleMessage[] = [];

  page.on('console', (msg) => {
    consoleMessages.push(msg);
  });

  // Wait a bit to collect console messages
  await page.waitForTimeout(2000);

  for (const msg of consoleMessages) {
    if (msg.type() === 'error') {
      issues.push({
        type: 'console',
        severity: 'critical',
        description: `Console error: ${msg.text().substring(0, 200)}`,
        suggestion: 'Fix JavaScript errors to ensure proper functionality',
      });
    } else if (msg.type() === 'warning') {
      issues.push({
        type: 'console',
        severity: 'warning',
        description: `Console warning: ${msg.text().substring(0, 200)}`,
        suggestion: 'Review warnings to prevent potential issues',
      });
    }
  }

  return issues;
}

async function getPerformanceMetrics(page: Page): Promise<PageAnalysis['metrics']> {
  const metrics = await page.evaluate(() => {
    const timing = performance.timing;
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find((e) => e.name === 'first-paint');

    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: firstPaint?.startTime || 0,
    };
  });

  return metrics;
}

async function takeScreenshots(page: Page, pageName: string): Promise<string[]> {
  const screenshots: string[] = [];

  // Desktop screenshot
  await page.setViewportSize({ width: 1280, height: 800 });
  const desktopPath = path.join(OUTPUT_DIR, `${pageName}-desktop.png`);
  await page.screenshot({ path: desktopPath, fullPage: true });
  screenshots.push(desktopPath);

  // Mobile screenshot
  await page.setViewportSize({ width: 375, height: 667 });
  const mobilePath = path.join(OUTPUT_DIR, `${pageName}-mobile.png`);
  await page.screenshot({ path: mobilePath, fullPage: true });
  screenshots.push(mobilePath);

  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 800 });

  return screenshots;
}

async function analyzePage(page: Page, browser: Browser, url: string, pageName: string): Promise<PageAnalysis> {
  console.log(`\nAnalyzing: ${url}`);

  // Navigate and wait for network idle
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`Warning: Page load timeout, continuing with analysis...`);
  }

  const title = await page.title();
  const issues: UIIssue[] = [];

  // Collect console errors in background
  const consoleIssues = await collectConsoleErrors(page);
  issues.push(...consoleIssues);

  // Get performance metrics
  const metrics = await getPerformanceMetrics(page);

  // Check for performance issues
  if (metrics.loadTime > 3000) {
    issues.push({
      type: 'performance',
      severity: 'warning',
      description: `Page load time is ${Math.round(metrics.loadTime)}ms`,
      suggestion: 'Consider optimizing assets and reducing bundle size for faster load times',
    });
  }

  if (metrics.firstPaint > 1500) {
    issues.push({
      type: 'performance',
      severity: 'info',
      description: `First paint at ${Math.round(metrics.firstPaint)}ms`,
      suggestion: 'Consider code splitting and lazy loading to improve initial render',
    });
  }

  // Run all analyses
  const accessibilityIssues = await analyzeAccessibility(page);
  issues.push(...accessibilityIssues);

  const layoutIssues = await analyzeLayout(page);
  issues.push(...layoutIssues);

  const responsiveIssues = await analyzeResponsive(page, browser);
  issues.push(...responsiveIssues);

  // Take screenshots
  const screenshots = await takeScreenshots(page, pageName);

  return {
    url,
    title,
    issues,
    metrics,
    screenshots,
  };
}

async function discoverPages(page: Page): Promise<string[]> {
  const links = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => a.getAttribute('href'))
      .filter((href): href is string => href !== null)
  );

  const uniquePages = new Set<string>();
  uniquePages.add('/');

  for (const link of links) {
    if (link.startsWith('/') && !link.startsWith('//') && !link.includes('#')) {
      // Normalize the path
      const path = link.split('?')[0];
      if (path && path !== '/') {
        uniquePages.add(path);
      }
    }
  }

  return Array.from(uniquePages).slice(0, 10); // Limit to 10 pages
}

async function main() {
  console.log('Starting UI Analysis for localhost:4000...\n');
  console.log('='.repeat(60));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // First, go to the homepage to discover pages
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Discover available pages
    console.log('Discovering pages...');
    const pages = await discoverPages(page);
    console.log(`Found ${pages.length} pages to analyze: ${pages.join(', ')}`);

    const allResults: PageAnalysis[] = [];

    // Analyze each page
    for (const pagePath of pages) {
      const url = `${BASE_URL}${pagePath}`;
      const pageName = pagePath === '/' ? 'home' : pagePath.replace(/\//g, '-').replace(/^-/, '');
      const result = await analyzePage(page, browser, url, pageName);
      allResults.push(result);
    }

    // Generate summary report
    console.log('\n' + '='.repeat(60));
    console.log('UI ANALYSIS SUMMARY');
    console.log('='.repeat(60));

    let totalCritical = 0;
    let totalWarning = 0;
    let totalInfo = 0;

    for (const result of allResults) {
      const critical = result.issues.filter((i) => i.severity === 'critical').length;
      const warning = result.issues.filter((i) => i.severity === 'warning').length;
      const info = result.issues.filter((i) => i.severity === 'info').length;

      totalCritical += critical;
      totalWarning += warning;
      totalInfo += info;

      console.log(`\n${result.url} (${result.title || 'No title'})`);
      console.log(`  Critical: ${critical} | Warnings: ${warning} | Info: ${info}`);
      console.log(`  Load time: ${result.metrics.loadTime}ms | First paint: ${Math.round(result.metrics.firstPaint)}ms`);
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`TOTALS: Critical: ${totalCritical} | Warnings: ${totalWarning} | Info: ${totalInfo}`);
    console.log('-'.repeat(60));

    // Detailed issues by category
    console.log('\n' + '='.repeat(60));
    console.log('DETAILED ISSUES BY CATEGORY');
    console.log('='.repeat(60));

    const categories = ['accessibility', 'performance', 'layout', 'console', 'ux', 'responsive'] as const;

    for (const category of categories) {
      const categoryIssues = allResults.flatMap((r) =>
        r.issues
          .filter((i) => i.type === category)
          .map((i) => ({ ...i, page: r.url }))
      );

      if (categoryIssues.length > 0) {
        console.log(`\n## ${category.toUpperCase()} (${categoryIssues.length} issues)`);

        for (const issue of categoryIssues) {
          const severityIcon =
            issue.severity === 'critical' ? '[!]' : issue.severity === 'warning' ? '[~]' : '[i]';
          console.log(`\n  ${severityIcon} ${issue.description}`);
          console.log(`      Page: ${issue.page}`);
          if (issue.element) {
            console.log(`      Element: ${issue.element}`);
          }
          console.log(`      Fix: ${issue.suggestion}`);
        }
      }
    }

    // Save full report as JSON
    const reportPath = path.join(OUTPUT_DIR, 'ui-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
    console.log(`\n\nFull report saved to: ${reportPath}`);
    console.log(`Screenshots saved to: ${OUTPUT_DIR}/`);

  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
