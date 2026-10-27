// const LoginAutomation = require('./login-automation');
// const config = require('./config');

// async function main() {
//     console.log('🚀 Starting Login Automation with Python OCR');
//     console.log('=' .repeat(50));
    
//     const automation = new LoginAutomation();
    
//     try {
//         // Initialize browser
//         console.log('Initializing browser...');
//         await automation.initialize();
        
//         // Run the automation process
//         const result = await automation.handleLoginProcess(
//             config.username,
//             config.password,
//             config.maxRetries
//         );
        
//         // Display results
//         console.log('\n' + '='.repeat(50));
//         if (result.success) {
//             console.log('✅ LOGIN SUCCESSFUL!');
//             console.log(`📊 Completed in ${result.attempts} attempt(s)`);
//             console.log(`🔤 Final CAPTCHA: ${result.captcha}`);
            
//             // Show session status
//             if (result.sessionSaved) {
//                 console.log('💾 Session saved successfully');
//             } else {
//                 console.log('⚠️  Session save failed');
//             }
            
//             // Check navigation status
//             if (result.navigation) {
//                 if (result.navigation.success) {
//                     switch (result.navigation.method) {
//                         case 'direct_redirect':
//                             console.log('🎯 Directly redirected to Assign Plan page');
//                             break;
//                         case 'manual_navigation':
//                             console.log('🎯 Successfully navigated to Assign Plan page');
//                             break;
//                         case 'home_page':
//                             console.log('📍 Landed on Home page');
//                             break;
//                         case 'transaction_area':
//                             console.log('📍 Landed in Transaction area');
//                             break;
//                         case 'unknown_page':
//                             console.log(`📍 Logged in to: ${result.navigation.url}`);
//                             break;
//                     }
//                 } else {
//                     console.log('⚠️  Login successful but navigation had issues');
//                     if (result.navigation.error) {
//                         console.log(`Error: ${result.navigation.error}`);
//                     }
//                 }
//             }
//         } else {
//             console.log('❌ LOGIN FAILED');
//             console.log(`📊 Failed after ${result.attempts} attempts`);
//             console.log('💡 Try checking username/password or OCR settings');
//         }
//         console.log('='.repeat(50));
        
//     } catch (error) {
//         console.error('\n💥 Fatal Error:', error.message);
//         console.error('Stack trace:', error.stack);
//     } finally {
//         // Always close browser
//         await automation.close();
//     }
// }

// // Handle process termination gracefully
// process.on('SIGINT', () => {
//     console.log('\n⚠️  Process interrupted by user');
//     process.exit(0);
// });

// process.on('unhandledRejection', (reason, promise) => {
//     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//     process.exit(1);
// });

// // Run the main function
// main().catch(console.error);



const LoginAutomation = require('./login-automation');
const config = require('./config');

// Read arguments like: --username X --password Y --stb Z [--headless]
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) {
                args[key] = true;            // flag without a value, e.g. --headless
            } else {
                args[key] = next;
                i++;
            }
        }
    }
    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const username  = args.username || config.username;
    const password  = args.password || config.password;
    const stbNumber = args.stb || args.stbNumber;
    const headless  = args.headless === true || args.headless === 'true';
    const id = /^\d+$/.test(String(args.id)) ? parseInt(args.id, 10) : null;

    if (!stbNumber || id === null) {
        console.error('❌ STB number or id missing/invalid. Run like:');
        console.error('   node run-automation.js --username K09D070 --password YOURPASS --stb 2502652689 --id 123');
        process.exit(1);
    }

    console.log('🚀 Starting Login Automation with Python OCR');
    console.log('='.repeat(50));
    console.log(`👤 Username: ${username}`);
    console.log(`🔢 STB: ${stbNumber}`);

    const automation = new LoginAutomation({
        id,
        username,
        password,
        stbNumber,
        headless,
        label: username,
    });

    try {
        console.log('Initializing browser...');
        await automation.initialize();

        const result = await automation.run(config.maxRetries || 3);

        console.log('\n' + '='.repeat(50));
        if (result.success) {
            console.log('✅ LOGIN SUCCESSFUL!');
            console.log(`📊 Completed in ${result.attempts} attempt(s)`);
            console.log(`🔤 Final CAPTCHA: ${result.captcha}`);
            console.log(result.sessionSaved ? '💾 Session saved successfully' : '⚠️  Session save failed');

            if (result.navigation && result.navigation.success) {
                console.log(`🎯 Dashboard search done for STB ${stbNumber}`);
            } else if (result.navigation) {
                console.log('⚠️  Login OK but dashboard steps failed');
                console.log(`Error: ${result.navigation.error}`);
            }
        } else {
            console.log('❌ LOGIN FAILED');
            console.log(`📊 Failed after ${result.attempts} attempts`);
            console.log(`Error: ${result.error}`);
        }
        console.log('='.repeat(50));

    } catch (error) {
        console.error('\n💥 Fatal Error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await automation.close();
    }
}

process.on('SIGINT', () => {
    console.log('\n⚠️  Process interrupted by user');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

main().catch(console.error);