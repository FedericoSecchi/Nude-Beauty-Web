# nude | Clean Beauty Landing Page

A static landing page for nude cosmetics - clean beauty products handmade with natural ingredients.

## Project Structure

```
nude-beauty-landing/
├── index.html      # Main HTML file
├── styles.css      # All CSS styles
├── app.js          # Vanilla JavaScript for interactivity
├── products.json   # Product data
├── img/
│   └── hero-bg.jpg # Hero section background image
└── public/
    ├── favicon.ico # Site favicon
    └── robots.txt  # SEO robots file
```

## Features

- **Pure Static Site**: No build process required - just HTML, CSS, and vanilla JavaScript
- **Responsive Design**: Works on all device sizes
- **Shopping Cart**: Interactive cart with sidebar
- **WhatsApp Integration**: Direct checkout via WhatsApp
- **LocalStorage**: Cart persists across page refreshes
- **Smooth Animations**: Fade-in and slide-up animations

## Usage

Simply open `index.html` in a web browser. No server or build process required.

For local development with a server (recommended to avoid CORS issues with JSON):

```sh
# Using Python
python3 -m http.server 8000

# Using Node.js (if you have it installed)
npx serve

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Deployment

This static site can be deployed to any static hosting service:

- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repo
- **GitHub Pages**: Enable in repository settings
- **Any web server**: Upload all files to your server

## Technologies

- HTML5
- CSS3 (with CSS Variables)
- Vanilla JavaScript (ES6+)
- No frameworks or build tools required
