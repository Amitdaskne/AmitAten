# Deployment Guide: GitHub Pages & Static Hosting

This application is built with **React, TypeScript, and Tailwind CSS**. When you build the project, it compiles down into **pure, standard, static HTML, CSS, and JS files** inside the `dist/` folder. These files have zero server dependencies and are 100% compatible with **GitHub Pages**!

---

## 🚀 How to Get the Compiled HTML, CSS, and JS Files
If you want the production-ready vanilla web files:
1. Open your terminal in the project directory.
2. Run the build command:
   ```bash
   npm run build
   ```
3. A folder named **`dist/`** will be generated.
4. Inside the **`dist/`** folder, you will find:
   - `index.html` (The entry page)
   - `assets/index-[hash].css` (Compiled Tailwind CSS styling)
   - `assets/index-[hash].js` (Compiled JavaScript containing all app logic, React, and Firebase connections)

---

## 🌐 Deploying to GitHub Pages (2 Simple Methods)

### Method 1: Using the Automated `gh-pages` Package (Recommended)
You can deploy your app with a single command:

1. **Install the `gh-pages` package** as a development dependency:
   ```bash
   npm install gh-pages --save-dev
   ```

2. **Add deploy scripts** to your `package.json` inside the `"scripts"` section:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Deploy the application** by running:
   ```bash
   npm run deploy
   ```
   *This automatically builds your app, creates a `gh-pages` branch on your GitHub repository, and publishes it online!*

---

### Method 2: Deploying via GitHub Actions (Fully Automated)
If you want GitHub to automatically build and deploy your app every time you push code:

1. Create a directory structure in your repository: `.github/workflows/`
2. Create a file named `.github/workflows/deploy.yml` with the following content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main  # or master

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-size: 20

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          branch: gh-pages
```

3. In your GitHub Repository settings under **Settings > Pages**:
   - Set **Build and deployment > Source** to **Deploy from a branch**.
   - Set the branch to **`gh-pages`** and folder to **`/ (root)`**.

---

## 📝 Important Notes for Static Deployments
- **Relative Pathing**: We have configured `vite.config.ts` to use relative paths (`base: './'`). This ensures all styles and scripts load correctly no matter which subdirectory or subpath your GitHub Pages URL uses.
- **Client-Side Routing**: If you decide to add client-side routing in the future (e.g., React Router), note that GitHub Pages does not support server-side fallbacks out of the box. Using Hash routing (`#`) is the easiest way to avoid 404 errors on direct URL refreshes.
- **Firebase Security**: Your Firebase configuration is embedded in the compiled JS bundle. This is normal and secure, provided you set up Firebase Firestore/Database Security Rules to restrict access to authorized users (as done in `firestore.rules`).
