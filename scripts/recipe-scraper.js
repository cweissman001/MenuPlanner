#!/usr/bin/env node

const axios = require('axios'); // HTTP client for web requests
const cheerio = require('cheerio'); // HTML parser for DOM manipulation
const fs = require('fs'); // File system for saving data
const path = require('path'); // Path utilities for file operations

class RecipeScraper {
  constructor() {
    this.recipes = []; // Array to store scraped recipes
    this.baseUrl = ''; // Base URL for relative links (optional)
    this.delay = 1000; // Delay between requests in milliseconds
  }

  /**
   * Scrape a single recipe from URL
   * @param {string} url - Recipe page URL
   */
  async scrapeRecipe(url) {
    try {
      console.log(`Scraping: ${url}`);
      
      // Fetch HTML with browser-like headers
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const recipe = this.parseRecipeData($, url);
      
      if (recipe) {
        this.recipes.push(recipe);
        console.log(`✓ ${recipe.title}`);
        return recipe;
      }
    } catch (error) {
      console.error(`✗ Failed: ${url} - ${error.message}`);
    }
    return null;
  }

  /**
   * Parse recipe data from HTML
   * Override for specific websites
   * @param {cheerio} $ - Cheerio DOM parser
   * @param {string} url - Source URL
   */
  parseRecipeData($, url) {
    // Extract recipe data using multiple selectors
    const recipe = {
      url: url, // Exact source URL
      title: this.getText($, [
        'h1',
        '.recipe-title',
        '.entry-title',
        '[itemprop="name"]'
      ]),
      description: this.getText($, [
        '.recipe-description',
        '.entry-summary',
        '[itemprop="description"]'
      ]),
      ingredients: this.getIngredients($),
      prepTime: this.getTime($, 'prep'),
      cookTime: this.getTime($, 'cook'),
      totalTime: this.getTime($, 'total'),
      servings: this.getServings($),
      difficulty: this.getDifficulty($),
      category: this.getCategory($),
      author: this.getText($, [
        '.author',
        '[itemprop="author"]',
        '.post-author'
      ]),
      datePublished: this.getDatePublished($),
      scrapedAt: new Date().toISOString() // Timestamp
    };

    // Return only if we have essential data
    return recipe.title && recipe.ingredients.length > 0 ? recipe : null;
  }

  /**
   * Extract text using multiple selector attempts
   * @param {cheerio} $ - Cheerio DOM parser
   * @param {string[]} selectors - Array of CSS selectors
   * @returns {string} Extracted text or empty string
   */
  getText($, selectors) {
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }
    return '';
  }

  /**
   * Extract ingredients list
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string[]} Array of ingredient strings
   */
  getIngredients($) {
    const ingredients = [];
    
    // Common ingredient list selectors
    const ingredientSelectors = [
      '.ingredient-item',
      '.ingredients li',
      '[itemprop="recipeIngredient"]',
      '.recipe-ingredients li',
      '.ingredient'
    ];

    // Extract ingredients, avoiding duplicates
    for (const selector of ingredientSelectors) {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && !ingredients.includes(text)) {
          ingredients.push(text);
        }
      });
    }

    return ingredients;
  }

  
  /**
   * Extract time information (prep/cook/total)
   * @param {cheerio} $ - Cheerio DOM parser
   * @param {string} type - Time type: 'prep', 'cook', or 'total'
   * @returns {string} Time string or empty
   */
  getTime($, type) {
    const selectors = [
      `[itemprop="${type}Time"]`,
      `.${type}-time`,
      `.${type}Time`,
      `.recipe-${type}-time`
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        // Prefer datetime attribute, fallback to text
        const datetime = element.attr('datetime') || element.find('time').attr('datetime');
        if (datetime) return datetime;
        return element.text().trim();
      }
    }

    return '';
  }

  /**
   * Extract servings information
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string} Servings info or empty
   */
  getServings($) {
    const selectors = [
      '[itemprop="recipeYield"]',
      '.servings',
      '.recipe-servings',
      '.yield'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        return element.text().trim();
      }
    }

    return '';
  }

  /**
   * Extract difficulty level
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string} Difficulty or empty
   */
  getDifficulty($) {
    const selectors = [
      '.difficulty',
      '.recipe-difficulty',
      '[itemprop="difficulty"]'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        return element.text().trim();
      }
    }

    return '';
  }

  /**
   * Extract recipe category/cuisine
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string} Category or empty
   */
  getCategory($) {
    const selectors = [
      '.category',
      '.recipe-category',
      '[itemprop="recipeCategory"]',
      '.cuisine'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        return element.text().trim();
      }
    }

    return '';
  }

  
  /**
   * Extract publication date
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string} Date string or empty
   */
  getDatePublished($) {
    const selectors = [
      '[itemprop="datePublished"]',
      '.published',
      '.post-date',
      'time[datetime]'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        return element.attr('datetime') || element.text().trim();
      }
    }

    return '';
  }

  /**
   * Save recipes to JSON file
   * @param {string} filename - Output filename
   */
  saveToFile(filename = 'scraped-recipes.json') {
    const filePath = path.join(__dirname, '..', 'data', filename);
    
    // Create data directory if needed
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write recipes to file
    fs.writeFileSync(filePath, JSON.stringify(this.recipes, null, 2));
    console.log(`Saved ${this.recipes.length} recipes to ${filePath}`);
  }

  /**
   * Scrape multiple recipes with delays
   * @param {string[]} urls - Array of recipe URLs
   * @returns {Object[]} Array of scraped recipes
   */
  async scrapeMultipleRecipes(urls) {
    console.log(`Starting: ${urls.length} recipes`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      await this.scrapeRecipe(url);
      
      // Respectful delay between requests
      if (i < urls.length - 1) {
        console.log(`Waiting ${this.delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    console.log(`Complete: ${this.recipes.length} recipes scraped`);
    return this.recipes;
  }
}

// Example usage
async function main() {
  const scraper = new RecipeScraper();
  
  // Add recipe URLs to scrape here
  const recipeUrls = [
    // Examples:
    // 'https://www.allrecipes.com/recipe/123/chocolate-cake',
    // 'https://www.foodnetwork.com/recipes/food-network-kitchen/pasta-1234567'
  ];

  if (recipeUrls.length === 0) {
    console.log('Add recipe URLs to the recipeUrls array');
    return;
  }

  await scraper.scrapeMultipleRecipes(recipeUrls);
  scraper.saveToFile();
}

// Export for module use
module.exports = RecipeScraper;

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
