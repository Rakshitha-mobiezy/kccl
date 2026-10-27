// Configuration file for login automation
module.exports = {
    // Login credentials (required)
    username: 'K09D070',
    password: 'Rajesh%5000',
    
    // Automation settings
    maxRetries: 3,
    headless: true, // Set to true to run without browser window
    slowMo: 1000,    // Milliseconds to slow down actions
    
    // CAPTCHA settings  
    enableManualCaptcha: true, // Enable manual input if OCR fails
    
    // OCR settings optimized for 6-digit CAPTCHA
    tesseractOptions: {
        tessedit_char_whitelist: '0123456789', // Only digits 0-9
        tessedit_pageseg_mode: 8, // Single word mode
        tessedit_ocr_engine_mode: 1, // LSTM engine only
        tessedit_do_invert: 0, // Don't invert image
        classify_bln_numeric_mode: 1 // Numeric mode
    },
    
    // Browser settings
    browserOptions: {
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};