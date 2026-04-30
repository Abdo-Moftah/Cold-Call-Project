const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Scraper API is running', version: '1.0.0' });
});

app.post('/api/extract', async (req, res) => {
  let browser;
  try {
    const { locations, keywords, maxResults: reqMaxResults, filterWebsite = 'any' } = req.body;
    const maxResultsLimit = reqMaxResults ? Math.min(parseInt(reqMaxResults), 200) : 50;

    if (!locations || !locations.length || !keywords || !keywords.length) {
      return res.status(400).json({ error: 'Missing locations or keywords' });
    }

    console.log('🚀 Starting extraction:', { locations, keywords, maxResults: maxResultsLimit });

    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--lang=en-US,en',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US'
    });

    const allLeads = [];

    for (const location of locations) {
      for (const keyword of keywords) {
        const query = `${keyword} in ${location}`;
        const page = await context.newPage();

        try {
          const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
          await page.goto(searchUrl);

          // Handle cookie consent
          try {
            const consentSelectors = [
              'button[aria-label="Accept all"]',
              'button[aria-label="Agree"]',
              'form[action*="consent"] button',
              'button:has-text("Accept all")',
              'button:has-text("Agree")'
            ];
            for (const selector of consentSelectors) {
              const btn = page.locator(selector).first();
              if (await btn.isVisible({ timeout: 2000 })) {
                await btn.click();
                await page.waitForTimeout(1000);
                break;
              }
            }
          } catch (e) {}

          const feedSelector = 'div[role="feed"]';
          try {
            await page.waitForSelector(feedSelector, { timeout: 15000 });
          } catch (e) {
            console.log(`Feed not found for ${query}.`);
          }

          let validLeadsForThisQuery = [];
          let processedIndex = 0;
          let prevDomCount = 0;
          let sameCountIterations = 0;

          while (validLeadsForThisQuery.length < maxResultsLimit) {
            const currentDomCount = await page.locator('div.Nv2PK').count();

            if (currentDomCount > processedIndex) {
              const newItemsData = await page.evaluate(({kw, loc, startIdx, endIdx}) => {
                // More robust selectors for Google Maps results
                const selectors = ['div.Nv2PK', 'div.UaMeBe', 'div.VkpYff', 'div[role="article"]', '.fontHeadlineSmall', '.qBF1Pd'];
                let rawItems = [];
                
                // Try multiple ways to find the cards
                const feeds = document.querySelectorAll('div[role="feed"]');
                if (feeds.length > 0) {
                  rawItems = Array.from(feeds[0].children).filter(el => el.innerText.length > 10);
                } else {
                  rawItems = Array.from(document.querySelectorAll('div.Nv2PK, div.UaMeBe, div.VkpYff'));
                }

                const items = rawItems.slice(startIdx, endIdx);
                
                return items.map((item, localIndex) => {
                  // Robust Name detection
                  const name = item.querySelector('.fontHeadlineSmall, .NrDZNb, .qBF1Pd, [role="heading"]')?.innerText || 
                               item.querySelector('a[aria-label]')?.getAttribute('aria-label') || '';
                  
                  // Robust Link detection
                  const link = item.querySelector('a.hfpxzc, a.V097gc, a[href*="/maps/place/"]')?.href || '';
                  
                  // Rating & Reviews
                  const ratingText = item.querySelector('span.MW4etd, .fontBodyMedium span[aria-hidden="true"]')?.innerText || '0';
                  const rating = parseFloat(ratingText.replace(',', '.')) || 0;
                  
                  const reviewsMatch = item.innerText.match(/\(([\d,]+)\)/) || item.innerText.match(/([\d,]+)\s+reviews/);
                  const reviews = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, '')) : 0;

                  // Extract Phone (regex fallback)
                  let phone = item.querySelector('span.UsdlK, .W4P9ed')?.innerText || '';
                  if (!phone) {
                    const phoneMatch = item.innerText.match(/(\+?\d{1,4}[\s-]?\(?\d{1,3}\)?[\s-]?\d{3,4}[\s-]?\d{3,4})/);
                    phone = phoneMatch ? phoneMatch[0] : '';
                  }

                  // Robust Website extraction from the list card
                  let website = '';
                  const links = Array.from(item.querySelectorAll('a'));
                  
                  // 1. Look for specific website buttons/labels
                  for (const a of links) {
                    const href = a.href;
                    if (!href) continue;
                    
                    const label = (a.getAttribute('aria-label') || '').toLowerCase();
                    const text = (a.innerText || '').toLowerCase();
                    const dataValue = (a.getAttribute('data-value') || '').toLowerCase();
                    
                    if (
                      a.classList.contains('lS30S') || 
                      label.includes('website') || 
                      label.includes('موقع') ||
                      text.includes('website') ||
                      text.includes('موقع') ||
                      dataValue.includes('website')
                    ) {
                      if (!href.includes('google.com/maps') && !href.includes('google.com/search')) {
                        website = href;
                        break;
                      }
                    }
                  }
                  
                  // 2. Fallback: find any external link that isn't Google Maps
                  if (!website) {
                    for (const a of links) {
                      const href = a.href;
                      if (href && href.startsWith('http') && !href.includes('google.com/maps') && !href.includes('google.com/search') && !href.includes('google.com/url?q=https://www.google.com/maps')) {
                         // Double check it's not the main place link
                         if (!a.classList.contains('hfpxzc') && !a.classList.contains('V097gc')) {
                            website = href;
                            break;
                         }
                      }
                    }
                  }
                  
                  // Category & Address from text lines
                  const lines = item.innerText.split('\n').filter(l => l.trim().length > 0);
                  let category = kw;
                  let address = '';
                  
                  if (lines.length > 1) {
                    // Usually line 0 is name, line 1 or 2 is category/address
                    const infoLine = lines.find(l => l.includes('·')) || lines[1] || '';
                    if (infoLine.includes('·')) {
                      const parts = infoLine.split('·');
                      category = parts[0].trim();
                      address = parts[parts.length - 1].trim();
                    }
                  }

                  return {
                    index: startIdx + localIndex,
                    hasWebsiteInList: !!website,
                    id: Math.random().toString(36).substr(2, 9),
                    name: name.trim(),
                    industry: category || kw,
                    phone: phone.trim(),
                    address: address.trim(),
                    rating,
                    reviewsCount: reviews,
                    website,
                    googleMapsLink: link,
                    searchKeyword: kw,
                    searchLocation: loc
                  };
                }).filter(item => item.name && item.name.length > 1);
              }, {kw: keyword, loc: location, startIdx: processedIndex, endIdx: currentDomCount});

              for (const itemData of newItemsData) {
                if (validLeadsForThisQuery.length >= maxResultsLimit) break;

                if (filterWebsite === 'no' && itemData.hasWebsiteInList) continue;
                if (filterWebsite === 'yes' && itemData.hasWebsiteInList) {
                  delete itemData.index;
                  delete itemData.hasWebsiteInList;
                  validLeadsForThisQuery.push(itemData);
                  continue;
                }

                if (!itemData.hasWebsiteInList && itemData.googleMapsLink) {
                  let detailPage = null;
                  try {
                    detailPage = await context.newPage();
                    await detailPage.route('**/*', route => {
                      if (['image', 'font', 'stylesheet', 'media'].includes(route.request().resourceType())) {
                        route.abort();
                      } else {
                        route.continue();
                      }
                    });

                    const langUrl = itemData.googleMapsLink.includes('?')
                      ? itemData.googleMapsLink + '&hl=en'
                      : itemData.googleMapsLink + '?hl=en';

                    await detailPage.goto(langUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });

                    const websiteLocator = detailPage.locator('a[data-item-id="authority"]');
                    await websiteLocator.waitFor({ state: 'attached', timeout: 2500 });

                    const deepWebsite = await websiteLocator.getAttribute('href');
                    if (deepWebsite) itemData.website = deepWebsite;
                  } catch (e) {
                  } finally {
                    if (detailPage) await detailPage.close();
                  }
                }

                if (filterWebsite === 'yes' && !itemData.website) continue;
                if (filterWebsite === 'no' && itemData.website) continue;

                delete itemData.index;
                delete itemData.hasWebsiteInList;
                validLeadsForThisQuery.push(itemData);
              }

              processedIndex = currentDomCount;
            }

            if (validLeadsForThisQuery.length >= maxResultsLimit) break;

            await page.evaluate((sel) => {
              const feed = document.querySelector(sel);
              if (feed) feed.scrollBy(0, 1500);
            }, feedSelector);

            await page.waitForTimeout(1500);

            if (currentDomCount === prevDomCount) {
              sameCountIterations++;
              if (sameCountIterations > 4) break;
            } else {
              sameCountIterations = 0;
            }
            prevDomCount = currentDomCount;

            const isEnd = await page.evaluate(() => {
              return document.body.innerText.includes("reached the end") ||
                     document.body.innerText.includes("نهاية القائمة") ||
                     document.body.innerText.includes("You've reached the end");
            });
            if (isEnd) break;
          }

          console.log(`Found ${validLeadsForThisQuery.length} valid leads for ${query}`);
          allLeads.push(...validLeadsForThisQuery);
        } catch (err) {
          console.error(`Error scraping ${query}:`, err);
        } finally {
          await page.close();
        }
      }
    }

    // De-duplication
    const uniqueLeadsMap = new Map();
    allLeads.forEach(lead => {
      const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';
      let key;
      if (cleanPhone && cleanPhone.length > 6) {
        key = `phone_${cleanPhone}`;
      } else if (lead.googleMapsLink) {
        key = `link_${lead.googleMapsLink}`;
      } else {
        key = `name_${lead.name.toLowerCase().trim()}`;
      }

      let isDuplicate = false;
      for (const [existingKey, existingLead] of uniqueLeadsMap.entries()) {
        if (existingKey === key || existingLead.name.toLowerCase().trim() === lead.name.toLowerCase().trim()) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) uniqueLeadsMap.set(key, lead);
    });

    res.json({ leads: Array.from(uniqueLeadsMap.values()) });

  } catch (error) {
    console.error('Extraction Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scraper API running on port ${PORT}`);
});
