const https = require('https');

// Test Facebook API senza credenziali sensibili
function testFacebookAPI() {
    console.log('🔍 Debug Facebook API Access');
    console.log('================================\n');
    
    const fbAccessToken = process.env.FB_ACCESS_TOKEN;
    const fbPageId = process.env.FB_PAGE_ID;
    
    if (!fbAccessToken || !fbPageId) {
        console.error('❌ Missing FB_ACCESS_TOKEN or FB_PAGE_ID environment variables');
        console.log('Set them temporarily for testing:');
        console.log('export FB_ACCESS_TOKEN=your_token');
        console.log('export FB_PAGE_ID=your_page_id');
        return;
    }
    
    const testUrl = `https://graph.facebook.com/v18.0/${fbPageId}/videos?fields=id,title,description,created_time,source,length&access_token=${fbAccessToken}&limit=3`;
    
    console.log(`📡 Testing Facebook API...`);
    console.log(`Page ID: ${fbPageId.substring(0, 8)}...`);
    
    https.get(testUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                if (result.error) {
                    console.error('❌ Facebook API Error:');
                    console.error(`   Code: ${result.error.code}`);
                    console.error(`   Message: ${result.error.message}`);
                    console.error(`   Type: ${result.error.type}`);
                    
                    if (result.error.code === 190) {
                        console.log('\n💡 Token potrebbe essere scaduto o invalido');
                    } else if (result.error.code === 10) {
                        console.log('\n💡 Permessi insufficienti - serve pages_read_engagement');
                    }
                    return;
                }
                
                console.log('✅ Facebook API Response:');
                console.log(`   Found ${result.data?.length || 0} videos`);
                
                if (result.data && result.data.length > 0) {
                    result.data.forEach((video, index) => {
                        console.log(`\n📹 Video ${index + 1}:`);
                        console.log(`   ID: ${video.id}`);
                        console.log(`   Title: ${video.title || 'No title'}`);
                        console.log(`   Has source URL: ${video.source ? '✅' : '❌'}`);
                        console.log(`   Created: ${video.created_time}`);
                        if (video.length) {
                            console.log(`   Duration: ${Math.floor(video.length / 60)}:${video.length % 60} min`);
                        }
                    });
                } else {
                    console.log('⚠️  No videos found in Facebook page');
                    console.log('   - Check if page has video posts');
                    console.log('   - Verify page visibility settings');
                }
                
            } catch (error) {
                console.error('❌ Failed to parse Facebook response:', error.message);
                console.log('Raw response:', data.substring(0, 200) + '...');
            }
        });
    }).on('error', (error) => {
        console.error('❌ Network error:', error.message);
    });
}

if (require.main === module) {
    testFacebookAPI();
}

module.exports = testFacebookAPI;