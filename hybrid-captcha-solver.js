const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');

class HybridCaptchaSolver {
    async solveCaptchaPython(imagePath) {
        console.log('🐍 Using Python OCR bridge...');
        
        try {
            // Call Python script
            const { stdout, stderr } = await execPromise(`python python_ocr_bridge.py "${imagePath}"`);
            
            if (stderr) {
                console.log('Python stderr:', stderr);
            }
            
            // Parse JSON result
            const result = JSON.parse(stdout.trim());
            
            console.log('🔍 Python OCR result:');
            console.log(`   Raw text: "${result.raw_text}"`);
            console.log(`   Digits: "${result.digits}"`);
            console.log(`   Length: ${result.length}`);
            
            if (result.success && result.digits && result.digits.length >= 5) {
                    console.log(`✅ Python OCR SUCCESS: ${result.digits}`);
                return {
                    success: true,
                    captcha: result.digits,
                    confidence: 95,
                    method: 'python-bridge'
                };
            } else {
                return {
                    success: false,
                    error: `Python OCR failed - got ${result.length} digits: "${result.digits}"`,
                    rawResult: result
                };
            }
            
        } catch (error) {
            console.error('💥 Python bridge error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async solveCaptcha(imageBuffer, imagePath = 'captcha.png') {
        try {
            // Save buffer to file for Python script
            if (imageBuffer) {
                fs.writeFileSync(imagePath, imageBuffer);
            }
            
            // Use Python OCR
            const result = await this.solveCaptchaPython(imagePath);
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = HybridCaptchaSolver;