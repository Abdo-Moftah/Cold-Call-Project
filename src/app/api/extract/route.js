import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request) {
  let browser;
  try {
    const { locations, keywords, maxResults: reqMaxResults, filterWebsite = 'any' } = await request.json();
    
    // Default to 50 if not provided, cap at a reasonable number to avoid infinite loops
    const maxResultsLimit = reqMaxResults ? Math.min(parseInt(reqMaxResults), 200) : 50;

    if (!locations || !locations.length || !keywords || !keywords.length) {
      return NextResponse.json({ error: 'Missing locations or keywords' }, { status: 400 });
    }

    console.log('🚀 Starting Robust Scraper for:', { locations, keywords, maxResults: maxResultsLimit });

    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--lang=en-US,en',
        '--no-sandbox',
        '--disable-setuid-sandbox'
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
          // Force English locale with ?hl=en
          const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
          await page.goto(searchUrl);
          
          // Handle cookie consent (more aggressive)
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
            
            // Process new items that appeared since last iteration
            if (currentDomCount > processedIndex) {
              const newItemsData = await page.evaluate(({kw, loc, startIdx, endIdx}) => {
                const items = Array.from(document.querySelectorAll('div.Nv2PK, div.UaMeBe, div.VkpYff')).slice(startIdx, endIdx);
                return items.map((item, localIndex) => {
                  const name = item.querySelector('div.fontHeadlineSmall, .NrDZNb, .qBF1Pd')?.innerText || '';
                  const link = item.querySelector('a.hfpxzc, a.V097gc')?.href || '';
                  const ratingText = item.querySelector('span.MW4etd, .fontBodyMedium span[aria-hidden="true"]')?.innerText || '';
                  
                  const ratingContainer = item.querySelector('.ZkP5Je, [aria-label*="stars"], [aria-label*="نجمة"]');
                  const ariaLabel = ratingContainer ? ratingContainer.getAttribute('aria-label') : '';
                  let exactReviews = 0;
                  if (ariaLabel) {
                    const reviewMatch = ariaLabel.match(/([\d,]+)\s*(?:review|مراجعة)/i);
                    if (reviewMatch && reviewMatch[1]) {
                      exactReviews = parseInt(reviewMatch[1].replace(/,/g, ''));
                    }
                  }
                  
                  const rating = parseFloat(ratingText) || 0;
                  const reviews = exactReviews || parseInt(item.querySelector('span.UY7F9')?.innerText.replace(/[^0-9]/g, '')) || 0;
                  
                  const fullText = item.innerText;
                  const lines = fullText.split('\n');
                  let category = '';
                  let address = '';
                  let phone = item.querySelector('span.UsdlK, .W4P9ed')?.innerText || '';

                  if (!phone) {
                     const textPieces = item.innerText.split(/[\n·]/);
                     for (let piece of textPieces) {
                        piece = piece.trim();
                        // Look for chunks that contain mostly digits and phone formatting characters
                        const digitCount = (piece.match(/\d/g) || []).length;
                        if (digitCount >= 7 && piece.length <= 20 && /^[\d\s()+-]+$/.test(piece)) {
                            phone = piece;
                            break;
                        }
                     }
                  }

                  if (lines.length > 2) {
                    const infoLine = lines[1] || lines[2];
                    if (infoLine?.includes('·')) {
                      const parts = infoLine.split('·');
                      category = parts[0].trim();
                      // Only set address if it's not actually the phone number
                      const lastPart = parts[parts.length - 1].trim();
                      if (lastPart !== phone) {
                         address = lastPart;
                      }
                    } else if (infoLine) {
                      category = infoLine.trim();
                    }
                  }

                  const website = item.querySelector('a.lS30S')?.href || '';

                  return {
                    index: startIdx + localIndex, // Keep global index if needed
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
                }).filter(item => item.name);
              }, {kw: keyword, loc: location, startIdx: processedIndex, endIdx: currentDomCount});

              for (const itemData of newItemsData) {
                if (validLeadsForThisQuery.length >= maxResultsLimit) break;

                // Early Discard based on list view and filterWebsite
                if (filterWebsite === 'no' && itemData.hasWebsiteInList) continue; // Instantly discard
                if (filterWebsite === 'yes' && itemData.hasWebsiteInList) {
                  // Instantly approve
                  delete itemData.index;
                  delete itemData.hasWebsiteInList;
                  validLeadsForThisQuery.push(itemData);
                  continue; 
                }

                // If we reach here, we are not sure (e.g. no website in list, but it might be hidden).
                // Or filterWebsite is 'any' and it's missing a website.
                // We Deep Scrape to verify.
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
                    if (deepWebsite) {
                      itemData.website = deepWebsite;
                    }
                  } catch (e) {
                    // Timeout or no website found
                  } finally {
                    if (detailPage) await detailPage.close();
                  }
                }

                // Final Verification against the filter
                if (filterWebsite === 'yes' && !itemData.website) continue; // Found out it truly has no website
                if (filterWebsite === 'no' && itemData.website) continue;   // Found a hidden website, discard

                delete itemData.index;
                delete itemData.hasWebsiteInList;
                validLeadsForThisQuery.push(itemData);
              }
              
              processedIndex = currentDomCount;
            }

            if (validLeadsForThisQuery.length >= maxResultsLimit) break;

            // Scroll down to load more
            await page.evaluate((sel) => {
              const feed = document.querySelector(sel);
              if (feed) feed.scrollBy(0, 1500);
            }, feedSelector);
            
            await page.waitForTimeout(1500);

            // Break conditions if end of list is reached
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

    // De-duplicate leads by Maps Link or Name+Address
    const uniqueLeadsMap = new Map();
    allLeads.forEach(lead => {
      const key = lead.googleMapsLink || `${lead.name}-${lead.address}`;
      if (!uniqueLeadsMap.has(key)) {
        uniqueLeadsMap.set(key, lead);
      }
    });

    return NextResponse.json({ leads: Array.from(uniqueLeadsMap.values()) });

  } catch (error) {
    console.error('Extraction Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
