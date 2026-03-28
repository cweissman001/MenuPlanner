# Recipe Scraper

A JavaScript web scraper for extracting recipe data from recipe websites. This script is designed to work with multiple recipe sites and can be customized for specific websites.

## Features

- Extracts recipe title, ingredients, instructions, and metadata
- Supports multiple recipe website formats
- Respectful scraping with configurable delays
- Saves data to JSON format
- Modular design for easy customization

## Installation

```bash
cd scripts
npm install
```

## Usage

### Basic Usage

1. Edit the `recipeUrls` array in `recipe-scraper.js` with the URLs you want to scrape
2. Run the scraper:

```bash
npm start
```

### Programmatic Usage

```javascript
const RecipeScraper = require('./recipe-scraper');

const scraper = new RecipeScraper();
await scraper.scrapeRecipe('https://example.com/recipe');
scraper.saveToFile('my-recipes.json');
```

## Customization

### Adding Support for New Websites

To add support for a specific recipe website, extend the `parseRecipeData` method:

```javascript
class CustomRecipeScraper extends RecipeScraper {
  parseRecipeData($, url) {
    // Custom parsing logic for specific website
    const recipe = super.parseRecipeData($, url);
    
    // Add website-specific customizations
    if (url.includes('specific-site.com')) {
      recipe.customField = $('.custom-selector').text().trim();
    }
    
    return recipe;
  }
}
```

### Data Structure

Scraped recipes include the following fields:

- `url`: Exact original URL
- `title`: Recipe title
- `description`: Recipe description
- `ingredients`: Array of ingredients
- `prepTime`: Preparation time
- `cookTime`: Cooking time
- `totalTime`: Total time
- `servings`: Number of servings
- `difficulty`: Difficulty level
- `category`: Recipe category/cuisine
- `author`: Recipe author
- `datePublished`: Publication date
- `scrapedAt`: When the recipe was scraped

## Output

Scraped recipes are saved to `../data/scraped-recipes.json` in the main project directory.

## Legal Notice

Please respect websites' terms of service and robots.txt files. This scraper should be used responsibly and only on websites where scraping is permitted. Always check the website's terms of service before scraping.

## Examples

### Scrape Multiple Recipes

```javascript
const urls = [
  'https://example.com/recipe1',
  'https://example.com/recipe2',
  'https://example.com/recipe3'
];

const scraper = new RecipeScraper();
scraper.delay = 2000; // 2 second delay
await scraper.scrapeMultipleRecipes(urls);
scraper.saveToFile('batch-recipes.json');
```

### Custom Delay and User Agent

```javascript
const scraper = new RecipeScraper();
scraper.delay = 3000; // 3 seconds between requests
// Custom user agent can be set in the axios headers in scrapeRecipe method
```
