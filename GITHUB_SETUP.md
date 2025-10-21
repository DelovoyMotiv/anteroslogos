# 🚀 GitHub Setup Instructions

This guide will help you push this project to GitHub and set up automatic deployment.

## 📋 Prerequisites

- GitHub account
- Git installed locally (already configured in this repo)
- Repository created on GitHub

## 🔧 Step-by-Step Setup

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `anoteros-logos` (or your preferred name)
3. Description: `Premium GEO (Generative Engine Optimization) agency website - React + TypeScript + Vite`
4. Choose: **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

### 2. Connect Local Repository to GitHub

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/anoteros-logos.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Verify Upload

Visit your repository on GitHub and verify all files are present.

## 🌐 Deployment Options

### Option A: Vercel (Recommended)

**Automatic deployment from GitHub:**

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add Environment Variables:
   ```
   VITE_SITE_URL=https://anoteroslogos.com
   VITE_SITE_NAME=Anóteros Lógos
   VITE_SITE_DESCRIPTION=Generative Engine Optimization Agency
   ```
6. Click **Deploy**
7. After deployment, add custom domain:
   - Go to **Settings** → **Domains**
   - Add `anoteroslogos.com`
   - Follow DNS instructions

### Option B: Netlify

**Automatic deployment from GitHub:**

1. Go to https://netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose GitHub and authorize
4. Select your repository
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add Environment Variables in **Site settings** → **Environment variables**
7. Click **Deploy site**
8. Add custom domain:
   - Go to **Domain settings**
   - Add `anoteroslogos.com`
   - Follow DNS instructions

### Option C: GitHub Pages

**Manual deployment:**

1. Build the project:
   ```bash
   npm run build
   ```
2. Install `gh-pages`:
   ```bash
   npm install --save-dev gh-pages
   ```
3. Add to `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   },
   "homepage": "https://YOUR_USERNAME.github.io/anoteros-logos"
   ```
4. Deploy:
   ```bash
   npm run deploy
   ```
5. Enable GitHub Pages:
   - Go to **Settings** → **Pages**
   - Source: `gh-pages` branch
   - Click **Save**

## 🔒 Security Notes

### Environment Variables

**NEVER commit `.env` file!** It's already in `.gitignore`.

For production deployment, add environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- GitHub Actions: Repository Settings → Secrets

### API Keys

When you add real API endpoints for the contact form:
1. Store API keys in environment variables
2. Never commit them to Git
3. Use hosting platform's secret management

## 📝 Post-Deployment Checklist

After deploying:
- [ ] Verify site loads at production URL
- [ ] Test contact form (when connected to real API)
- [ ] Check all links work correctly
- [ ] Verify robots.txt: `https://anoteroslogos.com/robots.txt`
- [ ] Verify sitemap.xml: `https://anoteroslogos.com/sitemap.xml`
- [ ] Test Open Graph preview: https://www.opengraph.xyz
- [ ] Validate Schema.org: https://validator.schema.org
- [ ] Test on mobile devices
- [ ] Check browser console for errors

## 🔄 Future Updates

To push updates:

```bash
# Make your changes
git add .
git commit -m "feat: your feature description"
git push

# Vercel/Netlify will auto-deploy
# For GitHub Pages:
npm run deploy
```

## 📊 Repository Settings Recommendations

### Branch Protection (Optional)

For team collaboration:
1. Go to **Settings** → **Branches**
2. Add rule for `main` branch:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

### GitHub Actions CI/CD (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
```

## 🆘 Troubleshooting

### Push rejected
```bash
git pull origin main --rebase
git push
```

### Build fails on Vercel/Netlify
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check environment variables are set

### Custom domain not working
- Wait 24-48 hours for DNS propagation
- Verify DNS settings with hosting provider
- Check SSL certificate is provisioned

---

**Repository URL**: https://github.com/YOUR_USERNAME/anoteros-logos  
**Live Site**: https://anoteroslogos.com  
**Last Updated**: 2025-01-21
