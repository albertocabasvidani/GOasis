const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { google } = require('googleapis');

class FacebookYouTubeSyncer {
  constructor() {
    this.fbAccessToken = process.env.FB_ACCESS_TOKEN;
    this.fbPageId = process.env.FB_PAGE_ID;
    this.youtubeClientId = process.env.YOUTUBE_CLIENT_ID;
    this.youtubeClientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    this.youtubeRefreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    
    if (!this.fbAccessToken || !this.fbPageId) {
      throw new Error('Missing Facebook credentials');
    }
    
    if (!this.youtubeClientId || !this.youtubeClientSecret || !this.youtubeRefreshToken) {
      throw new Error('Missing YouTube credentials');
    }

    this.youtube = google.youtube('v3');
    this.oauth2Client = new google.auth.OAuth2(
      this.youtubeClientId,
      this.youtubeClientSecret
    );
    this.oauth2Client.setCredentials({
      refresh_token: this.youtubeRefreshToken
    });
  }

  async getExistingVideos() {
    try {
      const data = await fs.readFile('data/videos.json', 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No existing videos.json found, starting fresh');
      return { videos: [], lastSync: null };
    }
  }

  async saveVideos(videoData) {
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile('data/videos.json', JSON.stringify(videoData, null, 2));
  }

  async getFacebookVideos(limit = 10) {
    const url = `https://graph.facebook.com/v18.0/${this.fbPageId}/videos?fields=id,title,description,created_time,source,length,picture&access_token=${this.fbAccessToken}&limit=${limit}`;
    
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) {
              reject(new Error(`Facebook API error: ${result.error.message}`));
            } else {
              resolve(result.data || []);
            }
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  async findOrCreatePlaylist(playlistName) {
    try {
      // First, search for existing playlist
      const playlists = await this.youtube.playlists.list({
        auth: this.oauth2Client,
        part: ['snippet'],
        mine: true,
        maxResults: 50
      });

      const existingPlaylist = playlists.data.items?.find(
        playlist => playlist.snippet.title === playlistName
      );

      if (existingPlaylist) {
        console.log(`✓ Found existing playlist: ${playlistName}`);
        return existingPlaylist.id;
      }

      // Create new playlist if not found
      console.log(`📝 Creating new playlist: ${playlistName}`);
      const newPlaylist = await this.youtube.playlists.insert({
        auth: this.oauth2Client,
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: playlistName,
            description: 'Video sincronizzati automaticamente dalla pagina Facebook di GOasis'
          },
          status: {
            privacyStatus: 'public'
          }
        }
      });

      return newPlaylist.data.id;
    } catch (error) {
      console.error('Error managing playlist:', error.message);
      return null;
    }
  }

  async addVideoToPlaylist(videoId, playlistId) {
    try {
      await this.youtube.playlistItems.insert({
        auth: this.oauth2Client,
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });
      console.log(`✓ Added video to playlist: ${videoId}`);
    } catch (error) {
      console.error(`Error adding video to playlist: ${error.message}`);
    }
  }

  async downloadVideo(videoUrl, filename) {
    const filePath = path.join('temp-video', filename);
    
    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(filePath);
      
      https.get(videoUrl, (response) => {
        // Check file size (limit to 800MB for safety)
        const contentLength = parseInt(response.headers['content-length'] || '0');
        if (contentLength > 800 * 1024 * 1024) {
          file.destroy();
          reject(new Error(`Video too large: ${Math.round(contentLength / 1024 / 1024)}MB`));
          return;
        }

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
        
        file.on('error', (err) => {
          file.destroy();
          fs.unlink(filePath).catch(() => {}); // Clean up failed download
          reject(err);
        });
      }).on('error', reject);
    });
  }

  async uploadToYouTube(videoPath, metadata) {
    try {
      const response = await this.youtube.videos.insert({
        auth: this.oauth2Client,
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: metadata.title || 'GOasis - Live Performance',
            description: `${metadata.description || 'GOasis tribute band live performance'}\n\n🎸 GOasis - Il tributo che anche Noel approverebbe (...forse)\n\nOriginal video from our Facebook page: https://facebook.com/${this.fbPageId}`,
            tags: ['GOasis', 'Oasis', 'tribute band', 'live music', 'rock'],
            categoryId: '10' // Music category
          },
          status: {
            privacyStatus: 'public'
          }
        },
        media: {
          body: require('fs').createReadStream(videoPath)
        }
      });

      return response.data;
    } catch (error) {
      console.error('YouTube upload error:', error.message);
      throw error;
    }
  }

  async cleanupVideo(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`✓ Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      console.log(`Warning: Could not clean up ${filePath}:`, error.message);
    }
  }

  async syncVideos(options = {}) {
    const { fullSync = false, playlistName = 'Da Facebook', limit } = options;
    
    console.log('🎬 Starting Facebook to YouTube video sync...');
    
    try {
      // Get or create the playlist
      const playlistId = await this.findOrCreatePlaylist(playlistName);
      
      // Determine video limit: custom limit > full sync default > normal sync default
      const videoLimit = limit || (fullSync ? 100 : 10);
      console.log(`📊 Fetching up to ${videoLimit} videos from Facebook...`);
      
      const [fbVideos, existingData] = await Promise.all([
        this.getFacebookVideos(videoLimit),
        this.getExistingVideos()
      ]);

      const existingVideoIds = new Set(existingData.videos.map(v => v.fbId));
      let videosToSync = fbVideos;
      
      if (!fullSync) {
        videosToSync = fbVideos.filter(video => !existingVideoIds.has(video.id));
      }
      
      if (videosToSync.length === 0) {
        console.log('✓ No new videos to sync');
        return;
      }

      console.log(`📹 Found ${videosToSync.length} videos to ${fullSync ? 'sync (full)' : 'sync (new only)'}`);

      const syncedVideos = [];
      
      for (const fbVideo of videosToSync) {
        try {
          // Skip if already exists (for full sync)
          if (fullSync && existingVideoIds.has(fbVideo.id)) {
            console.log(`⏭️  Skipping existing video: ${fbVideo.title || fbVideo.id}`);
            continue;
          }
          
          console.log(`\n🔄 Processing: ${fbVideo.title || fbVideo.id}`);
          
          if (!fbVideo.source) {
            console.log('⚠️  No video source URL, skipping');
            continue;
          }

          // Download video temporarily
          const filename = `${fbVideo.id}.mp4`;
          console.log('⬇️  Downloading video...');
          const videoPath = await this.downloadVideo(fbVideo.source, filename);
          
          // Upload to YouTube
          console.log('⬆️  Uploading to YouTube...');
          const youtubeVideo = await this.uploadToYouTube(videoPath, {
            title: fbVideo.title,
            description: fbVideo.description
          });

          // Add to playlist if created
          if (playlistId) {
            console.log('📂 Adding to playlist...');
            await this.addVideoToPlaylist(youtubeVideo.id, playlistId);
          }

          // Clean up temporary file immediately
          await this.cleanupVideo(videoPath);

          // Add to synced videos
          syncedVideos.push({
            fbId: fbVideo.id,
            youtubeId: youtubeVideo.id,
            title: fbVideo.title || 'GOasis Live',
            description: fbVideo.description || '',
            createdTime: fbVideo.created_time,
            syncedAt: new Date().toISOString(),
            youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideo.id}`,
            playlistId: playlistId,
            thumbnail: fbVideo.picture
          });

          console.log(`✅ Successfully synced: ${youtubeVideo.id}`);
          
        } catch (error) {
          console.error(`❌ Failed to sync video ${fbVideo.id}:`, error.message);
          // Continue with next video instead of stopping
        }
      }

      // Update video data
      if (syncedVideos.length > 0) {
        const updatedData = {
          videos: [...existingData.videos, ...syncedVideos],
          lastSync: new Date().toISOString(),
          totalSynced: (existingData.totalSynced || 0) + syncedVideos.length,
          playlistName: playlistName,
          playlistId: playlistId
        };
        
        await this.saveVideos(updatedData);
        console.log(`\n🎉 Sync complete! Successfully synced ${syncedVideos.length} videos to playlist "${playlistName}"`);
      } else {
        console.log('\n⚠️  No videos were successfully synced');
      }

    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the sync
if (require.main === module) {
  const syncer = new FacebookYouTubeSyncer();
  
  // Check for command line arguments
  const fullSync = process.argv.includes('--full') || process.argv.includes('-f');
  const customPlaylist = process.argv.find(arg => arg.startsWith('--playlist='))?.split('=')[1];
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  
  const options = {
    fullSync,
    playlistName: customPlaylist || 'Da Facebook',
    limit: limitArg ? parseInt(limitArg) : undefined
  };
  
  if (fullSync) {
    console.log('🔄 Running FULL sync of all Facebook videos...');
  }
  
  syncer.syncVideos(options).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = FacebookYouTubeSyncer;