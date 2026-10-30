const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const HybridCaptchaSolver = require('./hybrid-captcha-solver');
const config = require('./config');

class LoginAutomation {
    // constructor() {
    //     this.browser = null;
    //     this.page = null;
    //     this.baseUrl = 'https://sms.kccl.tv/';
    //     this.captchaSolver = new HybridCaptchaSolver();
    // }
    constructor(options = {}) {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'https://sms.kccl.tv/';
        this.captchaSolver = new HybridCaptchaSolver();

        // Accept credentials from run-automation.js
        this.username = options.username || '';
        this.password = options.password || '';
        this.stbNumber = options.stbNumber || options.stb || '';
        this.headless = options.headless === true || options.headless === 'true';
        this.label = options.label || this.username || 'unknown';
        this.id = options.id ?? null;   
    }

    // Called by run-automation.js — wraps handleLoginProcess and returns
// the shape run-automation.js expects.
    // async run(maxRetries = 3) {
    //     const result = await this.handleLoginProcess(
    //         this.username,
    //         this.password,
    //         maxRetries
    //     );

    //     return {
    //         id: this.id,
    //         username: this.username,
    //         password: this.password,
    //         stb: this.stbNumber,
    //         dueDate: result.dueDate || null,   // not yet implemented downstream
    //         success: !!result.success,
    //         attempts: result.attempts,
    //         captcha: result.captcha,
    //         navigation: result.navigation,
    //         sessionSaved: result.sessionSaved,
    //         ...(result.success ? {} : { error: result.error || 'Login failed' }),
    //     };
    // }

    async run(maxRetries = 3) {
    const result = await this.handleLoginProcess(
        this.username,
        this.password,
        maxRetries
    );

    const loginOk = !!result.success;
    const stepsOk = !!(result.navigation && result.navigation.success);
    const success = loginOk && stepsOk;

    let message;
    if (success) {
        message = 'Successfully renewed the pack.';
    } else if (!loginOk) {
        message = result.error || `Login failed after ${result.attempts} attempt(s)`;
    } else {
        message = (result.navigation && result.navigation.error) || 'Dashboard steps failed';
    }
    // keep only the first line, Playwright errors can be very long
    message = String(message).split('\n')[0];

    return {
        username: this.username,
        password: this.password,
        stb: this.stbNumber,
        dueDate: result.dueDate || null,
        success,
        message,
        attempts: result.attempts,
    };
}

    async initialize() {
        // Launch browser with necessary options
        this.browser = await chromium.launch({
            headless: this.headless, // Set to true for headless mode
            slowMo: this.headless ? 0 : 100,   // Slow down actions for better visibility
        });
        
        this.page = await this.browser.newPage();
        
        // Set viewport and user agent
        await this.page.setViewportSize({ width: 1280, height: 720 });
        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
    }

    async navigateToLogin() {
        console.log('Navigating to login page...');
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000);
    }

    async fillCredentials(username, password) {
        console.log('Filling login credentials...');
        await this.page.screenshot({ path: `debug_before_fill_${this.label}.png`, fullPage: true });
        console.log('📸 Debug screenshot saved before fill');
        // Fill username
        await this.page.locator('input[type="text"]').first().fill(username);
        // await this.page.fill('#txtUsername', username);
        console.log(`Filled username: ${username}`);
        
        // Fill password
        await this.page.locator('input[type="password"]').first().fill(password);
        // await this.page.fill('#txtPassword', password);
        console.log('Filled password');
    }

    async clearSession() {
        console.log('🧹 Clearing browser session...');
        
        // Clear all cookies
        const context = this.page.context();
        await context.clearCookies();
        
        // Clear localStorage and sessionStorage
        await this.page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        console.log('✅ Session cleared');
    }

    async solveCaptcha() {
        console.log('Starting 6-digit CAPTCHA solving with Python OCR...');
        
        try {
             // Wait for the CAPTCHA image element to exist
            await this.page.waitForSelector('#imgCaptcha', { timeout: 10000 });
            
            // Add a small delay to ensure the image has actually fully downloaded and rendered
            await this.page.waitForTimeout(3000);
            
            // Take screenshot of the CAPTCHA image
            const captchaElement = await this.page.$('#imgCaptcha');
            if (!captchaElement) {
                throw new Error('CAPTCHA image not found');
            }
            
            // Get the bounding box of the CAPTCHA image
            const boundingBox = await captchaElement.boundingBox();
            
            // Take screenshot of just the CAPTCHA area
            const captchaBuffer = await this.page.screenshot({
                clip: {
                    x: boundingBox.x,
                    y: boundingBox.y,
                    width: boundingBox.width,
                    height: boundingBox.height
                }
            });
            
            // Save CAPTCHA image for debugging
            const captchaPath = path.join(__dirname, `captcha_${this.label}.png`);
            fs.writeFileSync(captchaPath, captchaBuffer);
            console.log('📸 CAPTCHA image saved for processing...');
            
            // Use Python OCR bridge
            console.log('🐍 Using Python OCR (proven working method)...');
            const result = await this.captchaSolver.solveCaptcha(captchaBuffer, captchaPath);
            
            // if (!result.success) {
            //     throw new Error(`CAPTCHA solving failed: ${result.error}`);
            // }
            
            // const captchaText = result.captcha;
            if (!result.success || !result.captcha || result.captcha.length < 5) {
                throw new Error(`CAPTCHA solving failed: ${result.error || 'Too short'}`);
            }
            
            const captchaText = result.captcha;
            console.log(`⚠️  OCR got ${captchaText.length} digits. Trying anyway...`);
            console.log(`✅ 6-digit CAPTCHA solved: "${captchaText}" (${result.confidence}% confidence)`);
            
            // Fill the CAPTCHA input
            // await this.page.fill('#txtcaptcha', captchaText);
                        // Find all text inputs on the page
            const textInputs = await this.page.locator('input[type="text"]');
            
            // The CAPTCHA is usually the 3rd text box (Username=0, Password=1, CAPTCHA=2)
            // If your password field is type="password", then CAPTCHA is the 2nd text box (index 1).
            // We will fill index 1 AND index 2 just to be safe.
            
            console.log('Typing CAPTCHA...');
            try {
                // Try to fill the 2nd text box (index 1)
                await textInputs.nth(1).fill(captchaText, { timeout: 3000 });
                console.log('📝 CAPTCHA filled in input (Index 1)');
            } catch (e) {
                // If that fails, try the 3rd text box (index 2)
                await textInputs.nth(2).fill(captchaText, { timeout: 3000 });
                console.log('📝 CAPTCHA filled in input (Index 2)');
            }
            console.log('📝 CAPTCHA filled in input field');
            
            return captchaText;
            
        } catch (error) {
            console.error('💥 CAPTCHA solving failed:', error.message);
            throw error;
        }
    }

    async refreshCaptcha() {
        console.log('Refreshing CAPTCHA...');
        await this.page.click('#imgcatcharefresh');
        await this.page.waitForTimeout(2000); // Wait for new CAPTCHA to load
    }

    async submitForm() {
        console.log('Submitting login form...');
        try {
            // Try multiple likely selectors for the login button
            // 1. Look for a button or input with value/name "Login"
            // 2. Look for an image (since the button in the screenshot looks like it could be an image)
            // 3. Fallback to the old ID just in case
            const loginButton = this.page.locator('input[type="submit"], input[type="button"], button, img[src*="login" i], img[alt*="login" i], #ibtLogIn, #btnLogin, [name="btnLogin"]').first();
            
            // Wait for it to be visible
            await loginButton.waitFor({ state: 'visible', timeout: 5000 });
            
            // Click it
            await loginButton.click();
            console.log('✅ Login button clicked!');
            
        } catch (clickError) {
            console.log('⚠️ Could not find the login button using standard selectors. Trying Enter key...');
            // If we can't find the button, just press Enter in the CAPTCHA field
            await this.page.keyboard.press('Enter');
        }
        
        // Wait for navigation after login submission
        try {
            console.log('⏳ Waiting for login response and redirect...');
            
            // Wait for any navigation to occur
            await this.page.waitForLoadState('networkidle', { timeout: 15000 });
            
            // Give it a moment for any additional redirects
            await this.page.waitForTimeout(3000);
            
            const currentUrl = this.page.url();
            console.log(`Final URL after login: ${currentUrl}`);
            
            // Check if we successfully logged in (not on login page anymore)
            if (!currentUrl.includes('login')) {
                console.log('✅ Login successful - redirected away from login page');
                return true;
            } else {
                console.log('❌ Still on login page - login might have failed');
                return false;
            }
            
        } catch (error) {
            console.log('Navigation timeout or error:', error.message);
            
            // Check current URL even if navigation timed out
            const currentUrl = this.page.url();
            console.log(`Current URL after timeout: ${currentUrl}`);
            
            if (!currentUrl.includes('login')) {
                console.log('✅ Login appears successful despite navigation timeout');
                return true;
            } else {
                console.log('❌ Still on login page - might need to retry CAPTCHA');
                return false;
            }
        }
    }

    // async handlePostLogin() {
    //     console.log('🔍 Checking final landing page...');
        
    //     try {
    //         // Give a moment for any final redirects to complete
    //         await this.page.waitForTimeout(2000);
            
    //         const currentUrl = this.page.url();
    //         console.log(`Final URL: ${currentUrl}`);
            
    //         // Check what page we landed on
    //         if (currentUrl.includes('frmAssignPlan.aspx')) {
    //             console.log('✅ Successfully landed on Assign Plan page');
    //             return { success: true, method: 'direct_redirect', url: currentUrl };
    //         } else if (currentUrl.includes('Home.aspx')) {
    //             console.log('📍 Landed on Home page - navigating to Assign Plan...');
                
    //             // Try to navigate directly to Assign Plan page
    //             try {
    //                 const assignPlanUrl = currentUrl.replace('/Home.aspx', '/frmAssignPlan.aspx');
    //                 console.log(`🎯 Navigating to: ${assignPlanUrl}`);
                    
    //                 await this.page.goto(assignPlanUrl, { waitUntil: 'networkidle' });
    //                 await this.page.waitForTimeout(2000);
                    
    //                 const newUrl = this.page.url();
    //                 console.log(`Successfully navigated to: ${newUrl}`);
                    
    //                 if (newUrl.includes('frmAssignPlan.aspx')) {
    //                     console.log('✅ Successfully reached Assign Plan page');
    //                     return { success: true, method: 'manual_navigation', url: newUrl };
    //                 } else {
    //                     console.log('⚠️  Navigation attempted but ended up elsewhere');
    //                     return { success: false, method: 'navigation_failed', url: newUrl };
    //                 }
                    
    //             } catch (navError) {
    //                 console.error('❌ Failed to navigate to Assign Plan:', navError.message);
    //                 return { success: false, method: 'navigation_error', error: navError.message };
    //             }
    //         } else if (currentUrl.includes('Transaction')) {
    //             console.log('📍 Landed on Transaction area');
    //             return { success: true, method: 'transaction_area', url: currentUrl };
    //         } else {
    //             console.log('📍 Landed on unknown page');
    //             return { success: true, method: 'unknown_page', url: currentUrl };
    //         }
            
    //     } catch (error) {
    //         console.error('❌ Error checking post-login page:', error.message);
    //         return { success: false, error: error.message };
    //     }
    // }
    async handlePostLogin() {
    console.log('🔍 Handling post-login dashboard...');
    const page = this.page;
    let step = 'starting';

    try {
        // Make sure the STB number actually arrived
        console.log(`🔢 STB number received: "${this.stbNumber}"`);
        if (!this.stbNumber) {
            throw new Error('STB number is empty. Check how run-automation.js passes it.');
        }

        await page.waitForLoadState('domcontentloaded');
        console.log(`📍 Landed on URL: ${page.url()}`);
        step = 'closing the notification popup';
        // 1. Close the notification popup (exact "OK", visible only)
        try {
            const okButton = page.locator(
                'button:text-is("OK"):visible, a:text-is("OK"):visible, input[value="OK"]:visible'
            ).first();
            await okButton.waitFor({ state: 'visible', timeout: 15000 });
            await okButton.click();
            await okButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
            console.log('✅ Notification popup closed.');
        } catch (e) {
            console.log('ℹ️ No notification popup found, continuing...');
        }
        step = 'selecting Serial / VC Number';
        // 2. Select "Serial / VC Number" in the top-bar dropdown
        const select = page
            .locator('select:visible')
            .filter({ has: page.locator('option', { hasText: 'Serial / VC Number' }) })
            .first();
        await select.waitFor({ state: 'visible', timeout: 10000 });
        await select.selectOption({ label: 'Serial / VC Number' });

        // Verify the dropdown really changed
        const chosen = await select.evaluate(el => el.options[el.selectedIndex].text.trim());
        console.log(`✅ Dropdown now shows: "${chosen}"`);
        await page.waitForTimeout(500);
        step = 'typing the STB number';
        // 3. Find the input that belongs to this dropdown (same group in the top bar)
        const searchInput = select.locator(
            'xpath=ancestor::*[.//input[not(@type="hidden")]][1]//input[not(@type="hidden")][1]'
        );
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });

        // Clear the old value (e.g. K09D070), then type like a real user
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.press('Control+A');
        await searchInput.press('Backspace');
        await searchInput.pressSequentially(String(this.stbNumber), { delay: 20 });

        // Verify what is really in the box
        const typed = await searchInput.inputValue();
        console.log(`⌨️ Input box now contains: "${typed}"`);
        if (typed !== String(this.stbNumber)) {
            throw new Error(`Input has "${typed}" but expected "${this.stbNumber}"`);
        }

        await page.screenshot({ path: `debug_before_search_${this.label}.png`, fullPage: true });
        step = 'clicking search';
        // 4. Click the blue search button (Enter as fallback)
        try {
            const searchButton = searchInput.locator(
                'xpath=following::*[self::button or self::a][1]'
            );
            await searchButton.click({ timeout: 5000 });
            console.log('✅ Search button clicked.');
        } catch (e) {
            console.log('⚠️ Search button not clickable, pressing Enter instead...');
            await searchInput.press('Enter');
        }

        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `debug_after_search_${this.label}.png`, fullPage: true });
        console.log('✅ Search completed.');
        step = 'finding the STB row / green plus icon';
                // 5. Click the green "+" in the Operations column of the STB row
        console.log('➕ Looking for the green plus icon in STB Details...');
        const stbRow = page.locator('tr', { hasText: String(this.stbNumber) }).last();
        await stbRow.waitFor({ state: 'visible', timeout: 15000 });

        // Operations is the 2nd cell (1st cell is the checkbox)
        const opsCell = stbRow.locator('td').nth(1);
        await opsCell.waitFor({ state: 'visible', timeout: 5000 });
        console.log('🔎 Operations cell HTML:', (await opsCell.evaluate(el => el.innerHTML)).replace(/\s+/g, ' ').slice(0, 500));

        const plusIcon = opsCell
            .locator('a, button, input[type="image"], input[type="button"], img, i, span')
            .first();
        await plusIcon.scrollIntoViewIfNeeded();
        await plusIcon.click({ timeout: 5000 });
        console.log('✅ Green plus icon clicked.');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `debug_after_plus_${this.label}.png`, fullPage: true });
        const popupText = await page
            .locator('.modal.show, .swal2-popup')
            .first()
            .innerText()
            .catch(() => '(no popup visible)');
        console.log('🪟 Popup after plus click:', popupText.replace(/\s+/g, ' ').slice(0, 300));
        step = 'waiting for the Quick Activate popup';
        // 6. Popup 1 (Reactivate Services): click "Quick Activate"
        const quickActivate = page.locator(
            'button:text-is("Quick Activate"):visible, a:text-is("Quick Activate"):visible, input[value="Quick Activate"]:visible'
        ).first();
        await quickActivate.waitFor({ state: 'visible', timeout: 15000 });
        await page.screenshot({ path: `debug_reactivate_popup_${this.label}.png`, fullPage: true });
        await quickActivate.click();
        console.log('✅ Quick Activate clicked.');
        step = 'waiting for the confirmation (Yes) popup';
        // 7. Popup 2 (Are you sure...): click "Yes"
        const yesButton = page.locator(
            'button:text-is("Yes"):visible, a:text-is("Yes"):visible, input[value="Yes"]:visible'
        ).first();
        await yesButton.waitFor({ state: 'visible', timeout: 15000 });
        await page.screenshot({ path: `debug_confirm_popup_${this.label}.png`, fullPage: true });
        await yesButton.click();
        console.log('✅ Yes clicked. Activation confirmed.');

        // Wait for the confirm popup to go away, then capture the final state
        await yesButton.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `debug_after_activate_${this.label}.png`, fullPage: true });
        return { success: true, method: 'dashboard_search', url: page.url() };
    } catch (error) {
        console.error('❌ Error during post-login dashboard steps:', error.message);
        await page.screenshot({ path: `debug_postlogin_error_${this.label}.png`, fullPage: true }).catch(() => {});
        // return { success: false, error: error.message };
        return { success: false, error: `Failed while ${step}: ${String(error.message).split('\n')[0]}` };
    }
}

    async clickPackManagement() {
        console.log('Looking for Pack Management button...');
        
        try {
            // Wait for the Pack Management image to be available
            await this.page.waitForSelector('#MasterBody_imgPackManagement', { timeout: 5000 });
            console.log('Pack Management button found!');
            
            // Click the Pack Management image
            await this.page.click('#MasterBody_imgPackManagement');
            console.log('✅ Pack Management button clicked successfully');
            
            // Wait for page to load after clicking
            await this.page.waitForTimeout(3000);
            
            // Check if navigation occurred
            const currentUrl = this.page.url();
            console.log(`Current URL after Pack Management click: ${currentUrl}`);
            
            return { success: true, method: 'manual_click', url: currentUrl };
            
        } catch (error) {
            console.error('❌ Pack Management button not found or click failed:', error.message);
            
            // Take a screenshot for debugging
            try {
                await this.page.screenshot({ path: 'pack_management_error.png', fullPage: true });
                console.log('Screenshot saved as pack_management_error.png for debugging');
            } catch (screenshotError) {
                console.error('Could not save screenshot:', screenshotError.message);
            }
            
            return { success: false, error: error.message };
        }
    }

    async handleLoginProcess(username, password, maxRetries = 3) {
        let attempts = 0;
        
        
        while (attempts < maxRetries) {
            try {
                console.log(`\n--- Attempt ${attempts + 1} of ${maxRetries} ---`);
                
                // Navigate to the page
                await this.navigateToLogin();
                
                // Fill credentials
                await this.fillCredentials(username, password);
                
                // Solve CAPTCHA
                const captchaText = await this.solveCaptcha();
                
                // Submit form
                const success = await this.submitForm();
                
                if (success) {
                    console.log('✅ Login process completed successfully!');
                    
                    // Handle post-login navigation (automatic redirects or Pack Management click)
                    console.log('\n🎯 Handling post-login navigation...');
                    const postLoginResult = await this.handlePostLogin();
                    
                    if (postLoginResult.success) {
                        let message = '';
                        switch (postLoginResult.method) {
                            case 'direct_redirect':
                                message = '🎯 Successfully redirected directly to Assign Plan page';
                                break;
                            case 'manual_navigation':
                                message = '🎯 Successfully navigated to Assign Plan page from Home page';
                                break;
                            case 'home_page':
                                message = '📍 Landed on Home page after login';
                                break;
                            case 'transaction_area':
                                message = '📍 Landed in Transaction area';
                                break;
                            case 'unknown_page':
                                message = `📍 Logged in successfully (URL: ${postLoginResult.url})`;
                                break;
                        }
                        console.log(message);
                        
                        // Save session after successful navigation
                        console.log('\n💾 Saving login session...');
                        const sessionSaved = await this.saveSession();
                        
                        return { 
                            success: true, 
                            attempts: attempts + 1, 
                            captcha: captchaText,
                            navigation: postLoginResult,
                            sessionSaved: sessionSaved
                        };
                    } else {
                        console.log('⚠️  Login successful but post-login navigation failed');
                        return { 
                            success: true, 
                            attempts: attempts + 1, 
                            captcha: captchaText,
                            navigation: postLoginResult,
                            sessionSaved: false
                        };
                    }
                } else {
                    console.log('❌ Login submission failed, retrying...');
                }
                
            // } catch (error) {
            //     console.error(`Attempt ${attempts + 1} failed:`, error.message);
                
            //     // Try refreshing CAPTCHA if we're still on the page
            //     try {
            //         const currentUrl = this.page.url();
            
            
            // attempts++;
            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed:`, error.message);
                
                // Check if browser was closed unexpectedly
                if (this.page.isClosed()) {
                    console.error('💥 Browser closed unexpectedly. Stopping retries.');
                    return { success: false, attempts: attempts + 1, error: 'Browser closed' };
                }

                // Try refreshing CAPTCHA if we're still on the page
                try {
                    const currentUrl = this.page.url();
                    if (currentUrl.includes('login')) {
                        await this.refreshCaptcha();
                        await this.page.waitForTimeout(1000);
                    }
                } catch (refreshError) {
                    console.error('Could not refresh CAPTCHA:', refreshError.message);
                }
            }
            
            attempts++;
            
            if (attempts < maxRetries) {
                console.log(`Waiting before next attempt...`);
                // Use a regular sleep so it doesn't crash if the page closes
                await new Promise(r => setTimeout(r, 3000));
            }
        }    
        
        
        console.log(`❌ Failed to complete login after ${maxRetries} attempts`);
        return { success: false, attempts: attempts };
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed');
        }
    }

    async saveSession() {
        try {
            // Get cookies and storage state
            const cookies = await this.page.context().cookies();
            const storageState = await this.page.context().storageState();
            
            const sessionData = {
                cookies: cookies,
                storageState: storageState,
                timestamp: new Date().toISOString(),
                baseUrl: this.baseUrl
            };
            
            const sessionPath = path.join(__dirname, `session_${this.stbNumber || this.label}.json`);            fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
            console.log('💾 Session saved to session.json');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to save session:', error.message);
            return false;
        }
    }
}

// Usage example
async function runLoginAutomation() {
    const automation = new LoginAutomation();
    
    try {
        await automation.initialize();
        
        // Replace with your actual credentials
        const username = 'your_username'; // Your login username
        const password = 'your_password'; // Your login password
        
        const result = await automation.handleLoginProcess(username, password, 3);
        
        if (result.success) {
            console.log(`🎉 Success! Completed in ${result.attempts} attempt(s)`);
            console.log(`Final CAPTCHA used: ${result.captcha}`);
            
            if (result.sessionSaved) {
                console.log('💾 Session saved for future use');
            }
            
            if (result.navigation) {
                if (result.navigation.success) {
                    switch (result.navigation.method) {
                        case 'direct_redirect':
                            console.log('🎯 Directly redirected to Assign Plan page');
                            break;
                        case 'manual_navigation':
                            console.log('🎯 Successfully navigated to Assign Plan page');
                            break;
                        case 'home_page':
                            console.log('📍 Landed on Home page');
                            break;
                        case 'transaction_area':
                            console.log('📍 Landed in Transaction area');
                            break;
                        case 'unknown_page':
                            console.log(`📍 Logged in to: ${result.navigation.url}`);
                            break;
                    }
                } else {
                    console.log('⚠️  Login successful but navigation issue occurred');
                }
            }
        } else {
            console.log('😞 All attempts failed');
        }
        
    } catch (error) {
        // console.error('Fatal error:', error);
        return { success: false, error: `Failed while ${step}: ${String(error.message).split('\n')[0]}` };
    } finally {
        await automation.close();
    }
}

// Export for use as module
module.exports = LoginAutomation;

// Run directly if this file is executed
if (require.main === module) {
    runLoginAutomation();
}