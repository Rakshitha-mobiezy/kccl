// const fs = require('fs');
// const path = require('path');

// class PackManagementAutomation {
//     constructor(page) {
//         this.page = page;
//         this.vcNumber = 'T403221167147';
//     }

//     async waitForElement(selector, timeout = 10000) {
//         try {
//             await this.page.waitForSelector(selector, { timeout });
//             return true;
//         } catch (error) {
//             console.error(`❌ Element not found: ${selector}`);
//             return false;
//         }
//     }

//     async checkPage() {
//         try {
//             const currentUrl = this.page.url();
//             console.log(`📍 Current URL: ${currentUrl}`);
            
//             // Check if we're on the right page
//             if (!currentUrl.includes('frmAssignPlan.aspx')) {
//                 console.log('⚠️ Not on Pack Management page');
//                 return false;
//             }
            
//             // Check if there's a login form (session expired)
//             const hasLoginForm = await this.page.evaluate(() => {
//                 return document.querySelector('#txtUsername, input[name*="user"]') !== null;
//             });
            
//             if (hasLoginForm) {
//                 console.log('⚠️ Session expired - redirected to login');
//                 return false;
//             }
            
//             console.log('✅ On Pack Management page with valid session');
//             return true;
            
//         } catch (error) {
//             console.error('❌ Error checking page:', error.message);
//             return false;
//         }
//     }

//     async searchVCNumber(vcNumber) {
//         console.log(`🔍 Searching for VC Number: ${vcNumber}`);
        
//         try {
//             // First, verify we're on the right page
//             const isCorrectPage = await this.checkPage();
//             if (!isCorrectPage) {
//                 console.log('❌ Not on Pack Management page');
//                 return false;
//             }
            
//             // Take screenshot before search
//             await this.page.screenshot({ path: 'before_search.png' });
            
//             // Find the search input - these are specific to the Pack Management page
//             const searchSelectors = [
//                 // Specific selectors for Pack Management page
//                 'input[placeholder*="Search"]',
//                 'input[class*="txtSearch"]',
//                 'input[id*="txtSearch"]',
//                 'input[name*="txtSearch"]',
//                 'input[type="text"][class*="search"]',
//                 // Looking for the search input near "Search By"
//                 'input[type="text"]:not([readonly])',
//                 'input[type="text"]'
//             ];
            
//             let searchInput = null;
//             for (const selector of searchSelectors) {
//                 try {
//                     const elements = await this.page.$$(selector);
//                     if (elements && elements.length > 0) {
//                         // Find the visible one that's not on login page
//                         for (const element of elements) {
//                             const isVisible = await element.isVisible();
//                             if (isVisible) {
//                                 // Make sure this is not the username field
//                                 const id = await element.getAttribute('id');
//                                 const name = await element.getAttribute('name');
//                                 if (id !== 'txtUsername' && name !== 'txtUsername') {
//                                     searchInput = element;
//                                     console.log(`✅ Found search input using: ${selector}`);
//                                     break;
//                                 }
//                             }
//                         }
//                         if (searchInput) break;
//                     }
//                 } catch (e) {}
//             }
            
//             if (!searchInput) {
//                 console.log('❌ Search input not found');
//                 await this.page.screenshot({ path: 'search_input_not_found.png' });
//                 return false;
//             }
            
//             // Clear and fill the VC number
//             await searchInput.click();
//             await searchInput.fill('');
//             await searchInput.fill(vcNumber);
//             console.log(`✅ Entered VC Number: ${vcNumber}`);
            
//             await this.page.waitForTimeout(1000);
            
//             // Find and click search button
//             const searchButtonSelectors = [
//                 'button:has-text("Search")',
//                 'input[value="Search"]',
//                 'button[type="submit"]:has-text("Search")',
//                 'button[class*="btnSearch"]',
//                 'input[class*="btnSearch"]',
//                 'button[id*="btnSearch"]',
//                 'input[id*="btnSearch"]'
//             ];
            
//             let searchButton = null;
//             for (const selector of searchButtonSelectors) {
//                 try {
//                     const element = await this.page.$(selector);
//                     if (element && await element.isVisible()) {
//                         searchButton = element;
//                         console.log(`✅ Found search button using: ${selector}`);
//                         break;
//                     }
//                 } catch (e) {}
//             }
            
//             if (!searchButton) {
//                 console.log('⚠️ Search button not found, pressing Enter');
//                 await this.page.keyboard.press('Enter');
//             } else {
//                 await searchButton.click();
//             }
            
//             console.log('✅ Search submitted');
            
//             // Wait for results to load
//             await this.page.waitForTimeout(5000);
//             await this.page.screenshot({ path: 'after_search.png' });
            
//             return true;
            
//         } catch (error) {
//             console.error('❌ Error searching VC Number:', error.message);
//             await this.page.screenshot({ path: 'search_error.png' });
//             return false;
//         }
//     }

//     async clickMainTV() {
//         console.log('🖱️ Clicking on Main TV...');
        
//         try {
//             // Wait for search results to load
//             await this.page.waitForTimeout(2000);
            
//             // Look for Main TV link/button in the results
//             const mainTVSelectors = [
//                 'a:has-text("Main TV")',
//                 'button:has-text("Main TV")',
//                 'span:has-text("Main TV")',
//                 'div:has-text("Main TV")',
//                 'a[href*="MainTV"]',
//                 'td:has-text("Main TV")',
//                 'tr:has-text("Main TV")'
//             ];
            
//             let clicked = false;
//             for (const selector of mainTVSelectors) {
//                 try {
//                     const element = await this.page.$(selector);
//                     if (element && await element.isVisible()) {
//                         await element.click();
//                         clicked = true;
//                         console.log(`✅ Clicked Main TV using: ${selector}`);
//                         break;
//                     }
//                 } catch (e) {}
//             }
            
//             // If not found by text, try to find by looking for the VC number
//             if (!clicked) {
//                 console.log('⚠️ Main TV not found by text, looking for VC number row...');
                
//                 // Look for the row containing the VC number
//                 const vcElement = await this.page.$(`td:has-text("${this.vcNumber}"), span:has-text("${this.vcNumber}")`);
//                 if (vcElement) {
//                     // Click the Main TV link in that row
//                     const row = await vcElement.evaluateHandle(el => el.closest('tr'));
//                     if (row) {
//                         const mainTVLink = await row.$('a:has-text("Main TV"), button:has-text("Main TV")');
//                         if (mainTVLink) {
//                             await mainTVLink.click();
//                             clicked = true;
//                             console.log('✅ Clicked Main TV from the VC number row');
//                         }
//                     }
//                 }
//             }
            
//             // If still not found, try clicking any "Main TV" in the table
//             if (!clicked) {
//                 const mainTVElements = await this.page.$$('td:has-text("Main TV"), div:has-text("Main TV")');
//                 for (const element of mainTVElements) {
//                     if (await element.isVisible()) {
//                         await element.click();
//                         clicked = true;
//                         console.log('✅ Clicked Main TV from table');
//                         break;
//                     }
//                 }
//             }
            
//             if (!clicked) {
//                 console.log('❌ Could not find Main TV');
//                 await this.page.screenshot({ path: 'main_tv_not_found.png' });
//                 return false;
//             }
            
//             await this.page.waitForTimeout(3000);
//             await this.page.screenshot({ path: 'after_main_tv_click.png' });
//             return true;
            
//         } catch (error) {
//             console.error('❌ Error clicking Main TV:', error.message);
//             await this.page.screenshot({ path: 'main_tv_error.png' });
//             return false;
//         }
//     }

//     async clickActionArrow() {
//         console.log('▶️ Clicking Action arrow...');
        
//         try {
//             // Wait for Main TV details to load
//             await this.page.waitForTimeout(2000);
            
//             // Look for the action arrow/button
//             const actionSelectors = [
//                 'button[class*="action"]',
//                 'a[class*="action"]',
//                 'i[class*="fa-chevron-down"]',
//                 'i[class*="arrow"]',
//                 'span[class*="action"]',
//                 'td:has-text("Action")',
//                 'button:has-text("▼")',
//                 'button:has-text("Action")',
//                 'a:has-text("▶")',
//                 'div[class*="dropdown"] button'
//             ];
            
//             let clicked = false;
//             for (const selector of actionSelectors) {
//                 try {
//                     const element = await this.page.$(selector);
//                     if (element && await element.isVisible()) {
//                         await element.click();
//                         clicked = true;
//                         console.log(`✅ Clicked Action using: ${selector}`);
//                         break;
//                     }
//                 } catch (e) {}
//             }
            
//             // If not found, look for the action in the row
//             if (!clicked) {
//                 console.log('⚠️ Action button not found, looking in row...');
                
//                 const vcElement = await this.page.$(`td:has-text("${this.vcNumber}")`);
//                 if (vcElement) {
//                     const row = await vcElement.evaluateHandle(el => el.closest('tr'));
//                     if (row) {
//                         const actionButton = await row.$('td:last-child button, td:last-child a, td:has-text("Action")');
//                         if (actionButton) {
//                             await actionButton.click();
//                             clicked = true;
//                             console.log('✅ Clicked Action from row');
//                         }
//                     }
//                 }
//             }
            
//             if (!clicked) {
//                 // Try looking for dropdown icons
//                 const dropdownIcons = await this.page.$$('i.fa-chevron-down, i.fa-angle-down, i.fa-caret-down, span[class*="caret"]');
//                 for (const icon of dropdownIcons) {
//                     if (await icon.isVisible()) {
//                         await icon.click();
//                         clicked = true;
//                         console.log('✅ Clicked dropdown icon');
//                         break;
//                     }
//                 }
//             }
            
//             if (!clicked) {
//                 console.log('❌ Action arrow not found');
//                 await this.page.screenshot({ path: 'action_not_found.png' });
//                 return false;
//             }
            
//             // Wait for dropdown menu to appear
//             await this.page.waitForTimeout(2000);
//             await this.page.screenshot({ path: 'after_action_click.png' });
//             return true;
            
//         } catch (error) {
//             console.error('❌ Error clicking Action arrow:', error.message);
//             await this.page.screenshot({ path: 'action_error.png' });
//             return false;
//         }
//     }

//     async clickRenewOption() {
//         console.log('🔄 Clicking Renew option...');
        
//         try {
//             // Wait for dropdown menu to be visible
//             await this.page.waitForTimeout(1000);
            
//             // Look for Renew option in dropdown
//             const renewSelectors = [
//                 'a:has-text("Renew")',
//                 'button:has-text("Renew")',
//                 'span:has-text("Renew")',
//                 'li:has-text("Renew")',
//                 'div:has-text("Renew")',
//                 'a[href*="Renew"]',
//                 'button[class*="renew"]',
//                 'a[class*="renew"]'
//             ];
            
//             let clicked = false;
//             for (const selector of renewSelectors) {
//                 try {
//                     const element = await this.page.$(selector);
//                     if (element && await element.isVisible()) {
//                         await element.click();
//                         clicked = true;
//                         console.log(`✅ Clicked Renew using: ${selector}`);
//                         break;
//                     }
//                 } catch (e) {}
//             }
            
//             if (!clicked) {
//                 console.log('⚠️ Renew option not found, looking in dropdown menu...');
                
//                 // Try to find in dropdown menu items
//                 const menuItems = await this.page.$$('ul.dropdown-menu li a, ul[class*="dropdown"] li a, .dropdown-menu a');
//                 for (const item of menuItems) {
//                     try {
//                         const text = await item.textContent();
//                         if (text && text.toLowerCase().includes('renew')) {
//                             await item.click();
//                             clicked = true;
//                             console.log('✅ Clicked Renew from dropdown menu');
//                             break;
//                         }
//                     } catch (e) {}
//                 }
//             }
            
//             if (!clicked) {
//                 console.log('❌ Renew option not found');
//                 await this.page.screenshot({ path: 'renew_not_found.png' });
//                 return false;
//             }
            
//             await this.page.waitForTimeout(3000);
//             await this.page.screenshot({ path: 'after_renew_click.png' });
//             console.log('✅ Renew clicked successfully');
//             return true;
            
//         } catch (error) {
//             console.error('❌ Error clicking Renew:', error.message);
//             await this.page.screenshot({ path: 'renew_error.png' });
//             return false;
//         }
//     }

//     async performFullRenewal(vcNumber = this.vcNumber) {
//         console.log('\n🔄 Starting Full Renewal Process...');
//         console.log('='.repeat(60));
        
//         try {
//             // Step 1: Verify we're on Pack Management page
//             const isCorrectPage = await this.checkPage();
//             if (!isCorrectPage) {
//                 console.log('❌ Not on Pack Management page. Please navigate there first.');
//                 return false;
//             }
            
//             // Step 2: Search for VC Number
//             const searchResult = await this.searchVCNumber(vcNumber);
//             if (!searchResult) {
//                 console.log('❌ Failed to search VC Number');
//                 return false;
//             }
            
//             // Step 3: Click Main TV
//             const mainTVResult = await this.clickMainTV();
//             if (!mainTVResult) {
//                 console.log('❌ Failed to click Main TV');
//                 return false;
//             }
            
//             // Step 4: Click Action Arrow
//             const actionResult = await this.clickActionArrow();
//             if (!actionResult) {
//                 console.log('❌ Failed to click Action arrow');
//                 return false;
//             }
            
//             // Step 5: Click Renew
//             const renewResult = await this.clickRenewOption();
//             if (!renewResult) {
//                 console.log('❌ Failed to click Renew');
//                 return false;
//             }
            
//             console.log('\n✅ Renewal Process Completed Successfully!');
//             console.log('='.repeat(60));
//             return true;
            
//         } catch (error) {
//             console.error('❌ Error in renewal process:', error.message);
//             return false;
//         }
//     }

//     async getCustomerDetails() {
//         try {
//             console.log('📋 Getting customer details...');
            
//             const details = await this.page.evaluate(() => {
//                 const data = {};
                
//                 // Get customer name
//                 const nameElement = document.querySelector('td:has-text("Customer Name") + td, div:has-text("Customer Name") + div');
//                 if (nameElement) {
//                     data.customerName = nameElement.textContent.trim();
//                 }
                
//                 // Get account number
//                 const accountElement = document.querySelector('td:has-text("Customer A/C No.") + td');
//                 if (accountElement) {
//                     data.accountNo = accountElement.textContent.trim();
//                 }
                
//                 // Get mobile number
//                 const mobileElement = document.querySelector('td:has-text("Customer Mobile") + td');
//                 if (mobileElement) {
//                     data.mobile = mobileElement.textContent.trim();
//                 }
                
//                 return data;
//             });
            
//             console.log('📊 Customer Details:', details);
//             return details;
            
//         } catch (error) {
//             console.error('❌ Error getting customer details:', error.message);
//             return null;
//         }
//     }
// }

// module.exports = PackManagementAutomation;


const fs = require('fs');
const path = require('path');

class PackManagementAutomation {
    constructor(page) {
        this.page = page;
        this.vcNumber = 'T403221167147';
    }

    async waitForElement(selector, timeout = 10000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            console.error(`❌ Element not found: ${selector}`);
            return false;
        }
    }

    async scrollToElement(selector) {
        try {
            const element = await this.page.$(selector);
            if (element) {
                await element.scrollIntoViewIfNeeded();
                await this.page.waitForTimeout(500);
                console.log(`📜 Scrolled to element: ${selector}`);
                return true;
            }
            return false;
        } catch (error) {
            console.log(`⚠️ Could not scroll to ${selector}: ${error.message}`);
            return false;
        }
    }

    async checkPage() {
        try {
            const currentUrl = this.page.url();
            console.log(`📍 Current URL: ${currentUrl}`);
            
            if (!currentUrl.includes('frmAssignPlan.aspx')) {
                console.log('⚠️ Not on Pack Management page');
                return false;
            }
            
            const hasLoginForm = await this.page.evaluate(() => {
                return document.querySelector('#txtUsername, input[name*="user"]') !== null;
            });
            
            if (hasLoginForm) {
                console.log('⚠️ Session expired - redirected to login');
                return false;
            }
            
            console.log('✅ On Pack Management page with valid session');
            return true;
            
        } catch (error) {
            console.error('❌ Error checking page:', error.message);
            return false;
        }
    }

    async searchVCNumber(vcNumber) {
        console.log(`🔍 Searching for VC Number: ${vcNumber}`);
        
        try {
            const isCorrectPage = await this.checkPage();
            if (!isCorrectPage) {
                console.log('❌ Not on Pack Management page');
                return false;
            }
            
            await this.page.screenshot({ path: 'before_search.png' });
            
            const searchSelectors = [
                'input[placeholder*="Search"]',
                'input[class*="txtSearch"]',
                'input[id*="txtSearch"]',
                'input[name*="txtSearch"]',
                'input[type="text"][class*="search"]',
                'input[type="text"]:not([readonly])',
                'input[type="text"]'
            ];
            
            let searchInput = null;
            for (const selector of searchSelectors) {
                try {
                    const elements = await this.page.$$(selector);
                    if (elements && elements.length > 0) {
                        for (const element of elements) {
                            const isVisible = await element.isVisible();
                            if (isVisible) {
                                const id = await element.getAttribute('id');
                                const name = await element.getAttribute('name');
                                if (id !== 'txtUsername' && name !== 'txtUsername') {
                                    searchInput = element;
                                    console.log(`✅ Found search input using: ${selector}`);
                                    break;
                                }
                            }
                        }
                        if (searchInput) break;
                    }
                } catch (e) {}
            }
            
            if (!searchInput) {
                console.log('❌ Search input not found');
                await this.page.screenshot({ path: 'search_input_not_found.png' });
                return false;
            }
            
            await searchInput.click();
            await searchInput.fill('');
            await searchInput.fill(vcNumber);
            console.log(`✅ Entered VC Number: ${vcNumber}`);
            
            await this.page.waitForTimeout(1000);
            
            const searchButtonSelectors = [
                'button:has-text("Search")',
                'input[value="Search"]',
                'button[type="submit"]:has-text("Search")',
                'button[class*="btnSearch"]',
                'input[class*="btnSearch"]',
                'button[id*="btnSearch"]',
                'input[id*="btnSearch"]'
            ];
            
            let searchButton = null;
            for (const selector of searchButtonSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element && await element.isVisible()) {
                        searchButton = element;
                        console.log(`✅ Found search button using: ${selector}`);
                        break;
                    }
                } catch (e) {}
            }
            
            if (!searchButton) {
                console.log('⚠️ Search button not found, pressing Enter');
                await this.page.keyboard.press('Enter');
            } else {
                await searchButton.click();
            }
            
            console.log('✅ Search submitted');
            
            await this.page.waitForTimeout(5000);
            await this.page.screenshot({ path: 'after_search.png' });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error searching VC Number:', error.message);
            await this.page.screenshot({ path: 'search_error.png' });
            return false;
        }
    }

    async clickMainTV() {
        console.log('🖱️ Clicking on Main TV...');
        
        try {
            await this.page.waitForTimeout(2000);
            
            // First, scroll to make sure we can see the Main TV section
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            });
            await this.page.waitForTimeout(1000);
            
            const mainTVSelectors = [
                'a:has-text("Main TV")',
                'button:has-text("Main TV")',
                'span:has-text("Main TV")',
                'div:has-text("Main TV")',
                'a[href*="MainTV"]',
                'td:has-text("Main TV")',
                'tr:has-text("Main TV")'
            ];
            
            let clicked = false;
            for (const selector of mainTVSelectors) {
                try {
                    // Scroll to element before clicking
                    await this.scrollToElement(selector);
                    
                    const element = await this.page.$(selector);
                    if (element && await element.isVisible()) {
                        await element.click();
                        clicked = true;
                        console.log(`✅ Clicked Main TV using: ${selector}`);
                        break;
                    }
                } catch (e) {}
            }
            
            if (!clicked) {
                console.log('⚠️ Main TV not found by text, looking for VC number row...');
                
                const vcElement = await this.page.$(`td:has-text("${this.vcNumber}"), span:has-text("${this.vcNumber}")`);
                if (vcElement) {
                    await this.scrollToElement(`td:has-text("${this.vcNumber}")`);
                    
                    const row = await vcElement.evaluateHandle(el => el.closest('tr'));
                    if (row) {
                        const mainTVLink = await row.$('a:has-text("Main TV"), button:has-text("Main TV")');
                        if (mainTVLink) {
                            await mainTVLink.click();
                            clicked = true;
                            console.log('✅ Clicked Main TV from the VC number row');
                        }
                    }
                }
            }
            
            if (!clicked) {
                const mainTVElements = await this.page.$$('td:has-text("Main TV"), div:has-text("Main TV")');
                for (const element of mainTVElements) {
                    if (await element.isVisible()) {
                        await this.scrollToElement('td:has-text("Main TV")');
                        await element.click();
                        clicked = true;
                        console.log('✅ Clicked Main TV from table');
                        break;
                    }
                }
            }
            
            if (!clicked) {
                console.log('❌ Could not find Main TV');
                await this.page.screenshot({ path: 'main_tv_not_found.png' });
                return false;
            }
            
            await this.page.waitForTimeout(3000);
            await this.page.screenshot({ path: 'after_main_tv_click.png' });
            return true;
            
        } catch (error) {
            console.error('❌ Error clicking Main TV:', error.message);
            await this.page.screenshot({ path: 'main_tv_error.png' });
            return false;
        }
    }

    async clickActionArrow() {
        console.log('▶️ Clicking Action arrow...');
        
        try {
            await this.page.waitForTimeout(2000);
            
            // SCROLL TO THE BOTTOM OF THE PAGE TO SEE THE ACTION BUTTON
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await this.page.waitForTimeout(1500);
            
            // Also try scrolling to the specific area where action button is
            await this.page.evaluate(() => {
                const actionSection = document.querySelector('td:has-text("Action"), div:has-text("Action")');
                if (actionSection) {
                    actionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            await this.page.waitForTimeout(1000);
            
            // Take screenshot to see what's visible
            await this.page.screenshot({ path: 'before_action_scroll.png' });
            
            const actionSelectors = [
                'button[class*="action"]',
                'a[class*="action"]',
                'i[class*="fa-chevron-down"]',
                'i[class*="arrow"]',
                'span[class*="action"]',
                'td:has-text("Action")',
                'button:has-text("▼")',
                'button:has-text("Action")',
                'a:has-text("▶")',
                'div[class*="dropdown"] button'
            ];
            
            let clicked = false;
            for (const selector of actionSelectors) {
                try {
                    // Scroll to element before clicking
                    await this.scrollToElement(selector);
                    
                    const element = await this.page.$(selector);
                    if (element && await element.isVisible()) {
                        await element.click();
                        clicked = true;
                        console.log(`✅ Clicked Action using: ${selector}`);
                        break;
                    }
                } catch (e) {}
            }
            
            if (!clicked) {
                console.log('⚠️ Action button not found, looking in row...');
                
                const vcElement = await this.page.$(`td:has-text("${this.vcNumber}")`);
                if (vcElement) {
                    await this.scrollToElement(`td:has-text("${this.vcNumber}")`);
                    
                    const row = await vcElement.evaluateHandle(el => el.closest('tr'));
                    if (row) {
                        const actionButton = await row.$('td:last-child button, td:last-child a, td:has-text("Action")');
                        if (actionButton) {
                            await actionButton.click();
                            clicked = true;
                            console.log('✅ Clicked Action from row');
                        }
                    }
                }
            }
            
            if (!clicked) {
                const dropdownIcons = await this.page.$$('i.fa-chevron-down, i.fa-angle-down, i.fa-caret-down, span[class*="caret"]');
                for (const icon of dropdownIcons) {
                    if (await icon.isVisible()) {
                        await this.scrollToElement('i.fa-chevron-down');
                        await icon.click();
                        clicked = true;
                        console.log('✅ Clicked dropdown icon');
                        break;
                    }
                }
            }
            
            if (!clicked) {
                console.log('❌ Action arrow not found');
                await this.page.screenshot({ path: 'action_not_found.png' });
                return false;
            }
            
            await this.page.waitForTimeout(2000);
            await this.page.screenshot({ path: 'after_action_click.png' });
            return true;
            
        } catch (error) {
            console.error('❌ Error clicking Action arrow:', error.message);
            await this.page.screenshot({ path: 'action_error.png' });
            return false;
        }
    }

    async clickRenewOption() {
        console.log('🔄 Clicking Renew option...');
        
        try {
            await this.page.waitForTimeout(1000);
            
            // Make sure dropdown menu is visible by scrolling
            await this.page.evaluate(() => {
                const dropdown = document.querySelector('ul.dropdown-menu, .dropdown-menu, [class*="dropdown"]');
                if (dropdown) {
                    dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            await this.page.waitForTimeout(1000);
            
            const renewSelectors = [
                'a:has-text("Renew")',
                'button:has-text("Renew")',
                'span:has-text("Renew")',
                'li:has-text("Renew")',
                'div:has-text("Renew")',
                'a[href*="Renew"]',
                'button[class*="renew"]',
                'a[class*="renew"]'
            ];
            
            let clicked = false;
            for (const selector of renewSelectors) {
                try {
                    // Scroll to element before clicking
                    await this.scrollToElement(selector);
                    
                    const element = await this.page.$(selector);
                    if (element && await element.isVisible()) {
                        await element.click();
                        clicked = true;
                        console.log(`✅ Clicked Renew using: ${selector}`);
                        break;
                    }
                } catch (e) {}
            }
            
            if (!clicked) {
                console.log('⚠️ Renew option not found, looking in dropdown menu...');
                
                const menuItems = await this.page.$$('ul.dropdown-menu li a, ul[class*="dropdown"] li a, .dropdown-menu a');
                for (const item of menuItems) {
                    try {
                        const text = await item.textContent();
                        if (text && text.toLowerCase().includes('renew')) {
                            await this.scrollToElement('ul.dropdown-menu li a');
                            await item.click();
                            clicked = true;
                            console.log('✅ Clicked Renew from dropdown menu');
                            break;
                        }
                    } catch (e) {}
                }
            }
            
            if (!clicked) {
                console.log('❌ Renew option not found');
                await this.page.screenshot({ path: 'renew_not_found.png' });
                return false;
            }
            
            await this.page.waitForTimeout(3000);
            await this.page.screenshot({ path: 'after_renew_click.png' });
            console.log('✅ Renew clicked successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error clicking Renew:', error.message);
            await this.page.screenshot({ path: 'renew_error.png' });
            return false;
        }
    }

    async performFullRenewal(vcNumber = this.vcNumber) {
        console.log('\n🔄 Starting Full Renewal Process...');
        console.log('='.repeat(60));
        
        try {
            const isCorrectPage = await this.checkPage();
            if (!isCorrectPage) {
                console.log('❌ Not on Pack Management page. Please navigate there first.');
                return false;
            }
            
            // Step 1: Search for VC Number
            const searchResult = await this.searchVCNumber(vcNumber);
            if (!searchResult) {
                console.log('❌ Failed to search VC Number');
                return false;
            }
            
            // Step 2: Click Main TV
            const mainTVResult = await this.clickMainTV();
            if (!mainTVResult) {
                console.log('❌ Failed to click Main TV');
                return false;
            }
            
            // Step 3: Click Action Arrow (with scrolling)
            const actionResult = await this.clickActionArrow();
            if (!actionResult) {
                console.log('❌ Failed to click Action arrow');
                return false;
            }
            
            // Step 4: Click Renew (with scrolling)
            const renewResult = await this.clickRenewOption();
            if (!renewResult) {
                console.log('❌ Failed to click Renew');
                return false;
            }
            
            console.log('\n✅ Renewal Process Completed Successfully!');
            console.log('='.repeat(60));
            return true;
            
        } catch (error) {
            console.error('❌ Error in renewal process:', error.message);
            return false;
        }
    }

    async getCustomerDetails() {
        try {
            console.log('📋 Getting customer details...');
            
            const details = await this.page.evaluate(() => {
                const data = {};
                
                const nameElement = document.querySelector('td:has-text("Customer Name") + td, div:has-text("Customer Name") + div');
                if (nameElement) {
                    data.customerName = nameElement.textContent.trim();
                }
                
                const accountElement = document.querySelector('td:has-text("Customer A/C No.") + td');
                if (accountElement) {
                    data.accountNo = accountElement.textContent.trim();
                }
                
                const mobileElement = document.querySelector('td:has-text("Customer Mobile") + td');
                if (mobileElement) {
                    data.mobile = mobileElement.textContent.trim();
                }
                
                return data;
            });
            
            console.log('📊 Customer Details:', details);
            return details;
            
        } catch (error) {
            console.error('❌ Error getting customer details:', error.message);
            return null;
        }
    }
}

module.exports = PackManagementAutomation;