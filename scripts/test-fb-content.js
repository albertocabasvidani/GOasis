const https = require('https');

async function testFacebookContent() {
    const fbAccessToken = process.env.FB_ACCESS_TOKEN;
    const fbPageId = process.env.FB_PAGE_ID;
    
    if (!fbAccessToken || !fbPageId) {
        console.error('❌ Set FB_ACCESS_TOKEN and FB_PAGE_ID environment variables');
        return;
    }
    
    console.log('🔍 Testing Facebook content types...\n');
    
    // Test 1: Direct videos endpoint
    const videoUrl = `https://graph.facebook.com/v18.0/${fbPageId}/videos?access_token=${fbAccessToken}&limit=5`;
    console.log('📹 Testing /videos endpoint...');
    await testEndpoint(videoUrl, 'Direct Videos');
    
    // Test 2: Posts with video attachments
    const postsUrl = `https://graph.facebook.com/v18.0/${fbPageId}/posts?fields=id,message,created_time,attachments{media,type,url,subattachments}&access_token=${fbAccessToken}&limit=10`;
    console.log('\n📝 Testing /posts endpoint...');
    await testEndpoint(postsUrl, 'Posts with Attachments');
    
    // Test 3: Feed endpoint
    const feedUrl = `https://graph.facebook.com/v18.0/${fbPageId}/feed?fields=id,message,created_time,attachments&access_token=${fbAccessToken}&limit=10`;
    console.log('\n📰 Testing /feed endpoint...');
    await testEndpoint(feedUrl, 'Feed');
}

function testEndpoint(url, name) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (result.error) {
                        console.error(`❌ ${name} Error:`, result.error.message);
                        resolve();
                        return;
                    }
                    
                    const items = result.data || [];
                    console.log(`📊 ${name}: Found ${items.length} items`);
                    
                    if (items.length > 0) {
                        items.slice(0, 3).forEach((item, index) => {
                            console.log(`\n${index + 1}. ${item.id}`);
                            if (item.message) console.log(`   Message: ${item.message.substring(0, 60)}...`);
                            if (item.title) console.log(`   Title: ${item.title}`);
                            if (item.created_time) console.log(`   Created: ${item.created_time}`);
                            if (item.source) console.log(`   Source URL: ✅`);
                            
                            // Check attachments
                            if (item.attachments && item.attachments.data) {
                                item.attachments.data.forEach(att => {
                                    console.log(`   Attachment: ${att.type || 'unknown'}`);
                                    if (att.media) console.log(`   Media: ${att.media.type || 'unknown'}`);
                                });
                            }
                        });
                    } else {
                        console.log(`   No ${name.toLowerCase()} found`);
                    }
                    
                    resolve();
                } catch (error) {
                    console.error(`❌ Failed to parse ${name}:`, error.message);
                    console.log(`Raw response: ${data.substring(0, 200)}...`);
                    resolve();
                }
            });
        }).on('error', (error) => {
            console.error(`❌ ${name} network error:`, error.message);
            resolve();
        });
    });
}

if (require.main === module) {
    testFacebookContent();
}

module.exports = testFacebookContent;