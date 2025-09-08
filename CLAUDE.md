# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GOasis is a tribute band website for an Italian Oasis cover band. It's a static HTML/CSS/JS site with automated content management through Notion API and GitHub Actions.

## Commands

### Development & Testing
```bash
# Install dependencies
npm install

# Fetch latest concert data from Notion
npm run fetch-concerts

# Generate map data for past concerts
npm run fetch-map

# Generate Facebook post images for concerts
npm run generate-fb-posts

# Post to Facebook (requires FB_ACCESS_TOKEN and FB_PAGE_ID)
npm run post-to-facebook

# Run local development server (use any static server)
python3 -m http.server 8000
# or
npx serve .
```

### Deployment
The site automatically deploys to GitHub Pages via GitHub Actions on push to main branch.

## Architecture

### Content Flow
1. **Notion Database** → Concert data source (managed by band)
2. **GitHub Actions** → Daily automation (6:00 UTC)
3. **Node.js Scripts** → Fetch and transform data
4. **JSON Files** → Store structured data (`data/concerts.json`, `data/past-concerts-map.json`)
5. **Automatic Deploy** → GitHub Pages deployment triggered by data changes
6. **index.html** → Reads JSON and renders content dynamically on live site

### Key Integration Points

#### Notion Integration (scripts/fetch-concerts.js)
- Connects to Notion database via `NOTION_API_KEY` and `NOTION_DATABASE_ID`
- Fetches future concerts with date filtering
- Transforms Notion properties to JSON structure
- Handles coordinate generation for map display

#### Facebook Automation (scripts/generate-fb-posts.js, scripts/post-to-facebook.js)
- Uses Canvas API to generate branded post images
- Groups concerts by month for batch posting
- Optional automatic posting via Facebook Graph API
- Images saved to `img/` directory with timestamped filenames

#### Map Integration (scripts/fetch-past-concerts-map.js)
- Generates Leaflet.js compatible coordinate data
- Fetches location coordinates via Nominatim API
- Creates clustered map markers for past venues

### Frontend Structure

The entire website is in a single `index.html` file with embedded JavaScript for:
- Dynamic concert list loading from JSON
- Photo gallery with carousel/lightbox functionality
- Interactive Leaflet map for past concerts
- YouTube video integration with custom controls
- Responsive mobile menu
- Smooth scroll navigation

Styling is in `style.css` organized by:
- Base styles and variables
- Component-specific sections (hero, band, concerts, gallery, video, etc.)
- Responsive breakpoints for mobile/tablet/desktop

### GitHub Actions Workflows

- **`.github/workflows/pages.yml`**: Deploy to GitHub Pages (triggered on every push to main)
- **`.github/workflows/update-concerts.yml`**: Daily concert data sync (6:00 UTC) - automatically triggers deploy when data changes
- **`.github/workflows/update-concert-map.yml`**: Update map coordinates
- **`.github/workflows/generate-fb-images.yml`**: Generate social media content

**Important**: The update-concerts workflow commits without `[skip ci]` to ensure automatic deployment when concert data is updated. All workflows check for actual changes before committing to avoid empty commits.

## Environment Variables

Required for automation (set in GitHub Secrets):
- `NOTION_API_KEY`: Notion integration token
- `NOTION_DATABASE_ID`: Concert database ID
- `FB_ACCESS_TOKEN`: Facebook page access token (optional)
- `FB_PAGE_ID`: Facebook page ID (optional)

## Important Patterns

1. **No Frontend Framework**: Pure HTML/CSS/JavaScript - avoid adding React, Vue, etc.
2. **JSON as Database**: All dynamic content stored in JSON files under `data/`
3. **Single Page Application**: Everything in index.html with section-based navigation
4. **Automation First**: Content updates via GitHub Actions, not manual editing
5. **Mobile Responsive**: Mobile-first CSS with specific breakpoints at 768px and 1024px
6. **Image Naming**: Facebook posts use format `fb-post-concerts-YYYY-MM-DD-TIMESTAMP.png`
7. **No Contact Forms**: The site uses social media and WhatsApp for contact - avoid adding complex contact forms
8. **Video Integration**: YouTube embed with custom controls for sound toggle and forced 1080p quality
9. **Automatic Deployment**: Concert data changes trigger immediate site deployment - no `[skip ci]` in update workflows

## Troubleshooting

### Missing Concert Data on Site
If concerts appear in Notion but not on the live site:
1. Check that `data/concerts.json` contains the missing concerts
2. Verify the date filter in `scripts/fetch-concerts.js` (uses `on_or_after: today`)
3. Ensure the update-concerts workflow doesn't use `[skip ci]` to allow automatic deployment
4. Check GitHub Actions runs for both "Update Concerts from Notion" and "Deploy to GitHub Pages"