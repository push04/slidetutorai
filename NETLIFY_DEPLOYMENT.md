# Deploying SlideTutor AI to Netlify

This guide will help you deploy your SlideTutor AI application to Netlify.

## Prerequisites

- A GitHub account
- A Netlify account (free tier works perfectly)
- Your Supabase credentials
- Your OpenRouter API key

## Step 1: Prepare Your Repository

1. Download the project as a ZIP file from Replit
2. Extract the ZIP file on your computer
3. Create a new GitHub repository
4. Push the code to your GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Deploy to Netlify

### Option A: Deploy from GitHub (Recommended)

1. Go to [https://netlify.com](https://netlify.com) and log in
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18 or higher (set in Environment variables as `NODE_VERSION=18`)

### Option B: Manual Deploy

1. Build your project locally:
   ```bash
   npm install
   npm run build
   ```
2. Go to Netlify and drag-drop the `dist` folder

## Step 3: Configure Environment Variables

In your Netlify dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add these three variables with YOUR OWN credentials:

   ```
   VITE_SUPABASE_URL = your_supabase_project_url
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
   VITE_OPENROUTER_API_KEY = your_openrouter_api_key
   ```

   **How to get these credentials:**
   - **Supabase**: Go to [supabase.com](https://supabase.com), create a project, and find the URL and anon key in Project Settings → API
   - **OpenRouter**: Go to [openrouter.ai](https://openrouter.ai), sign up, and create an API key in your dashboard

3. Click "Save" and trigger a new deploy

## Step 4: Test Your Deployment

1. Wait for the build to complete (usually 1-2 minutes)
2. Click on the provided URL (e.g., `https://your-site-name.netlify.app`)
3. Test the authentication flow
4. Upload a document and generate lessons/quizzes/flashcards

## Troubleshooting

### Build Fails

- Check that `NODE_VERSION` is set to 18 or higher
- Verify all environment variables are set correctly
- Check the build logs for specific errors

### Environment Variables Not Working

- Make sure variable names start with `VITE_`
- Redeploy after adding variables
- Clear browser cache and try again

### 404 Errors on Page Refresh

Netlify needs a redirect rule. Create a `public/_redirects` file with:
```
/*    /index.html   200
```

## Automatic Deployments

Once connected to GitHub, Netlify will automatically deploy:
- Every push to the `main` branch
- Every pull request (as a preview deployment)

## Custom Domain (Optional)

1. Go to **Domain settings** in Netlify
2. Click "Add custom domain"
3. Follow the instructions to configure DNS

## Performance Optimization

Your site is already optimized with:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification
- ✅ Gzip compression
- ✅ CDN distribution (via Netlify)

## Security Notes

- Never commit `.env` files to Git
- Use Netlify's environment variables for all secrets
- Rotate API keys regularly
- Enable Supabase Row Level Security (RLS)

## Support

If you encounter issues:
1. Check Netlify build logs
2. Verify environment variables are set
3. Test locally with `npm run build && npm run preview`

---

**Your app is now live on Netlify! 🎉**
