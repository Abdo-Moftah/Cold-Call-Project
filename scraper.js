const { chromium } = require('playwright');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

async function scrapeGoogleMaps(query, maxResults = 50) {
    console.log(`\n🚀 Starting scraper for: "${query}"`);
    
    const browser = await chromium.launch({ 
        headless: true, // Run in headless mode for speed
        args: ['--disable-blink-features=AutomationControlled'] 
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`);
        
        // Handle cookie consent
        try {
            const consentBtn = page.getByRole('button', { name: /Accept all|وافق على الكل/i });
            if (await consentBtn.isVisible({ timeout: 5000 })) {
                await consentBtn.click();
            }
        } catch (e) {}

        const feedSelector = 'div[role="feed"]';
        await page.waitForSelector(feedSelector, { timeout: 15000 });

        console.log("Scrolling to load results...");
        
        let prevCount = 0;
        let sameCountIterations = 0;

        while (true) {
            const currentCount = await page.locator('div.Nv2PK').count();
            process.stdout.write(`\rFound ${currentCount} items...`);

            if (currentCount >= maxResults) break;

            await page.evaluate((sel) => {
                const feed = document.querySelector(sel);
                if (feed) feed.scrollBy(0, 1500);
            }, feedSelector);

            await page.waitForTimeout(2000);

            if (currentCount === prevCount) {
                sameCountIterations++;
                if (sameCountIterations > 5) break;
            } else {
                sameCountIterations = 0;
            }
            prevCount = currentCount;

            const isEnd = await page.evaluate(() => {
                return document.body.innerText.includes("reached the end") || 
                       document.body.innerText.includes("نهاية القائمة") ||
                       document.body.innerText.includes("You've reached the end");
            });
            if (isEnd) break;
        }

        console.log(`\nExtracting data...`);

        const results = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div.Nv2PK'));
            return items.map(item => {
                const name = item.querySelector('div.fontHeadlineSmall')?.innerText || '';
                const link = item.querySelector('a.hfpxzc')?.href || '';
                const ratingText = item.querySelector('span.MW4etd')?.innerText || '';
                const reviewsText = item.querySelector('span.UY7F9')?.innerText || '';
                
                // Parse rating and reviews
                const rating = parseFloat(ratingText) || '';
                const reviews = reviewsText.replace(/[()]/g, '').trim() || '';

                // Extract more from the full text
                const fullText = item.innerText;
                const lines = fullText.split('\n');
                
                // Usually:
                // Line 0: Name
                // Line 1: Rating, Reviews, Price
                // Line 2: Category, Address fragment
                // Line 3: Description or Status
                
                let category = '';
                let address = '';
                let phone = item.querySelector('span.UsdlK')?.innerText || '';

                if (lines.length > 2) {
                    const infoLine = lines[2];
                    if (infoLine.includes('·')) {
                        const parts = infoLine.split('·');
                        category = parts[0].trim();
                        address = parts[parts.length - 1].trim();
                    } else {
                        category = infoLine.trim();
                    }
                }

                // Try to find a phone number in the text if not found in specific span
                if (!phone) {
                    const phoneMatch = fullText.match(/(\+?\d{1,4}[\s-])?(\d{7,12})/);
                    if (phoneMatch) phone = phoneMatch[0];
                }

                return {
                    name,
                    rating,
                    reviews,
                    phone,
                    category,
                    address,
                    link
                };
            });
        });

        // Save to CSV
        const csvPath = path.join(process.cwd(), 'gmaps_leads.csv');
        const csvWriter = createObjectCsvWriter({
            path: csvPath,
            header: [
                {id: 'name', title: 'Business Name'},
                {id: 'category', title: 'Category'},
                {id: 'rating', title: 'Rating'},
                {id: 'reviews', title: 'Reviews'},
                {id: 'phone', title: 'Phone'},
                {id: 'address', title: 'Address/Snippet'},
                {id: 'link', title: 'Google Maps Link'}
            ]
        });

        await csvWriter.writeRecords(results);
        console.log(`✅ Success! Saved ${results.length} leads to ${csvPath}`);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await browser.close();
    }
}

const query = process.argv[2] || 'Restaurants in Cairo';
const limit = parseInt(process.argv[3]) || 50;

scrapeGoogleMaps(query, limit);
