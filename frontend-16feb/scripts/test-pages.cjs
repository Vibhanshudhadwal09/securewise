const puppeteer = require('puppeteer');

const pages = [
  '/',
  '/dashboard',
  '/compliance',
  '/controls',
  '/evidence-ledger',
  '/security/overview',
  '/security/incidents',
  '/integrations',
  '/settings',
];

async function testPages() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const browser = await puppeteer.launch();
  const results = [];

  for (const page of pages) {
    const testPage = await browser.newPage();

    try {
      const response = await testPage.goto(`${baseUrl}${page}`, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      });

      const errors = [];
      testPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      const status = response.status();

      results.push({
        page,
        status,
        errors,
        success: status === 200 && errors.length === 0,
      });

      console.log(`Tested ${page}: ${status === 200 ? 'OK' : 'FAILED'}`);
    } catch (error) {
      results.push({
        page,
        status: 'ERROR',
        errors: [error.message],
        success: false,
      });
      console.log(`Failed ${page}: ${error.message}`);
    }

    await testPage.close();
  }

  await browser.close();

  console.log('\n=== TEST RESULTS ===');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.success).length}`);
  console.log(`Failed: ${results.filter((r) => !r.success).length}`);

  return results;
}

testPages().catch(console.error);
