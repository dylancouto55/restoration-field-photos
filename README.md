# Restoration Field Photos

A CompanyCam-style photo documentation app for Restoration Pressure Washing LLC, with Jobber integration.

## Features

- **Photo Capture** - Take/upload photos on the job, tag as before/during/after/detail
- **Job Organization** - Create jobs manually or sync from Jobber
- **Photo Gallery** - Browse, filter, and view all photos with lightbox
- **Jobber Integration** - OAuth2 connection pulls jobs, clients, and addresses
- **Mobile Optimized** - Dark UI for field visibility, camera capture, PWA installable
- **Persistent Storage** - IndexedDB via localforage (survives browser refreshes)

## Project Structure

```
restoration-field-photos/
  api/
    jobber/
      auth.js        # OAuth initiation (redirects to Jobber)
      callback.js    # OAuth callback (exchanges code for tokens)
      graphql.js     # GraphQL proxy to Jobber API
      refresh.js     # Token refresh endpoint
  public/
    manifest.json    # PWA manifest
  src/
    main.jsx         # React entry point
    App.jsx          # Main app component (all screens)
    storage.js       # LocalForage persistence layer
    jobber.js        # Jobber API client
    utils.js         # Image compression, ID generation, formatters
  index.html         # HTML entry point
  package.json       # Dependencies
  vite.config.js     # Vite build config
  vercel.json        # Vercel deployment config
```

## Deployment with Cowork

### Step 1: Push to GitHub

Have Cowork create a new GitHub repo and push all these files:

```
1. Create a new repo called "restoration-field-photos" on GitHub
2. Push all files from this project to the repo
```

### Step 2: Deploy on Vercel

```
1. Go to vercel.com and sign in with GitHub
2. Click "Add New Project"
3. Import the "restoration-field-photos" repo
4. Framework Preset: Vite
5. Build Command: npm run build
6. Output Directory: dist
7. Click Deploy
```

### Step 3: Add Environment Variables

In Vercel project settings > Environment Variables, add:

```
JOBBER_CLIENT_ID     = (your Jobber app client ID)
JOBBER_CLIENT_SECRET = (your Jobber app client secret)
```

### Step 4: Set Up Jobber Developer App

1. Go to https://developer.getjobber.com
2. Create a new app
3. Set the redirect URI to: `https://YOUR-VERCEL-URL.vercel.app/api/jobber/callback`
4. Copy the Client ID and Client Secret into Vercel env vars
5. Redeploy on Vercel for the env vars to take effect

### Step 5: Connect Jobber in the App

1. Open your deployed app URL
2. Go to Settings tab
3. Click "Connect Jobber"
4. Authorize the app in Jobber's OAuth screen
5. Jobs will sync automatically

## Usage

1. **Create a job** (or sync from Jobber)
2. **Go to Capture tab** on the job site
3. **Take photos** - assign to job, tag type, add notes
4. **Review in Gallery** or in the job detail view
5. **Filter by type** (before/during/after/detail)

## Tech Stack

- **Frontend**: React 18 + Vite
- **Storage**: localforage (IndexedDB)
- **API**: Vercel Serverless Functions
- **Jobber**: OAuth2 + GraphQL API
- **Hosting**: Vercel

## PWA Installation

On mobile, open the deployed URL in Chrome/Safari and use "Add to Home Screen" for an app-like experience with the Restoration branding.
