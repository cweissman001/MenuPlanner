#!/usr/bin/env node

const axios = require('axios'); // HTTP client for web requests
const cheerio = require('cheerio'); // HTML parser for DOM manipulation
const fs = require('fs'); // File system for saving data
const path = require('path'); // Path utilities for file operations

class PinchOfYumScraperV3 {
  constructor() {
    this.recipes = []; // Array to store scraped recipes
    this.baseUrl = 'https://pinchofyum.com'; // Base URL for relative links
    this.delay = 2000; // 2 second delay between requests
  }

  /**
   * Extract all recipe URLs from the vegetarian recipes page
   * @param {string} url - Vegetarian recipes page URL
   * @returns {string[]} Array of recipe URLs
   */
  async extractRecipeUrls(url) {
    try {
      console.log(`Extracting recipe URLs from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const recipeUrls = [];

      // Extract URLs from the page content - look for links that follow the recipe pattern
      $('a[href*="/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        
        // Check if this looks like a recipe link - be more inclusive
        if (href && 
            !href.includes('#') && 
            !href.includes('youtube.com') &&
            !href.includes('ck.page') && // newsletter links
            !href.includes('instagram.com') &&
            !href.includes('pinterest.com') &&
            !href.includes('tiktok.com') &&
            !href.includes('facebook.com') &&
            !href.includes('twitter.com') &&
            !href.includes('/category/') && // category pages
            !href.includes('/tag/') && // tag pages
            text.length > 3 && // has meaningful text
            !text.includes('Home') &&
            !text.includes('About') &&
            !text.includes('Recipes') &&
            !text.includes('Start Here') &&
            !text.includes('Contact') &&
            !text.includes('Privacy') &&
            !text.includes('Resources') &&
            !text.includes('Sponsored') &&
            !text.includes('Media') &&
            !text.includes('Making Money')) {
          
          const fullUrl = href.startsWith('http') ? href : this.baseUrl + href;
          if (!recipeUrls.includes(fullUrl) && fullUrl.includes('pinchofyum.com/')) {
            recipeUrls.push(fullUrl);
          }
        }
      });

      console.log(`Found ${recipeUrls.length} recipe URLs`);
      return recipeUrls;
    } catch (error) {
      console.error(`Error extracting URLs: ${error.message}`);
      return [];
    }
  }

  /**
   * Scrape a single recipe from Pinch of Yum URL
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
   * Parse recipe data from Pinch of Yum HTML using structured JSON-LD data
   * @param {cheerio} $ - Cheerio DOM parser
   * @param {string} url - Source URL
   */
  parseRecipeData($, url) {
    // Method 1: Try to extract from structured JSON-LD data (most reliable)
    let structuredRecipe = null;
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        if (data['@type'] === 'Recipe') {
          structuredRecipe = data;
        } else if (data['@graph']) {
          const recipe = data['@graph'].find(item => item['@type'] === 'Recipe');
          if (recipe) structuredRecipe = recipe;
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    });

    let ingredients = [];
    let title = '';
    let description = '';
    let prepTime = '';
    let cookTime = '';
    let totalTime = '';
    let servings = '';

    if (structuredRecipe) {
      // Extract from structured data
      ingredients = structuredRecipe.recipeIngredient || [];
      title = structuredRecipe.name || '';
      description = structuredRecipe.description || '';
      prepTime = structuredRecipe.prepTime || '';
      cookTime = structuredRecipe.cookTime || '';
      totalTime = structuredRecipe.totalTime || '';
      servings = structuredRecipe.recipeYield || '';
    } else {
      // Fallback to traditional extraction methods
      ingredients = this.getIngredientsFromSelectors($);
      title = this.getText($, [
        'h1.entry-title',
        'h1',
        '.recipe-title',
        '[itemprop="name"]'
      ]);
      description = this.getText($, [
        '.entry-content p:first',
        '.recipe-description',
        '[itemprop="description"]'
      ]);
      prepTime = this.getTime($, 'prep');
      cookTime = this.getTime($, 'cook');
      totalTime = this.getTime($, 'total');
      servings = this.getServings($);
    }

    const recipe = {
      url: url, // Exact source URL
      title: title,
      description: description,
      ingredients: ingredients,
      prepTime: prepTime,
      cookTime: cookTime,
      totalTime: totalTime,
      servings: servings,
      category: 'Vegetarian', // We know this from the page we're scraping
      datePublished: this.getDatePublished($),
      scrapedAt: new Date().toISOString() // Timestamp
    };

    // Return only if we have essential data
    return recipe.title && recipe.ingredients.length > 0 ? recipe : null;
  }

  /**
   * Extract ingredients using traditional selectors (fallback method)
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string[]} Array of ingredient strings
   */
  getIngredientsFromSelectors($) {
    const ingredients = [];
    
    // Pinch of Yum specific ingredient selectors
    const ingredientSelectors = [
      '.wprm-recipe-ingredient',
      '.ingredient-item',
      '.ingredients li',
      '[itemprop="recipeIngredient"]',
      '.recipe-ingredients li',
      '.ingredient'
    ];

    // Extract ingredients with strict filtering
    for (const selector of ingredientSelectors) {
      $(selector).each((i, elem) => {
        let text = $(elem).text().trim();
        // Remove common unwanted text and formatting
        text = text.replace(/^•\s*/, '').replace(/^\d+\.\s*/, '').replace(/^-\s*/, '');
        text = text.replace(/\[.*?\]/g, ''); // Remove bracketed text
        text = text.replace(/Buy Now →.*/g, ''); // Remove affiliate links
        
        // Strict filtering for ingredients only
        if (text && 
            !ingredients.includes(text) && 
            text.length > 2 &&
            text.length < 200 &&
            !text.includes('Buy Now') &&
            !text.includes('Equipment') &&
            !text.includes('Instructions') &&
            !text.includes('Description') &&
            !text.includes('Reply') &&
            !text.includes('@') &&
            !text.includes('\t') &&
            !text.includes('Pinch of Yum') &&
            !text.includes('😉') &&
            !text.includes('…') &&
            !text.match(/\d{2}\/\d{2}\/\d{2}/) &&
            !text.match(/\d{1,2}:\d{2}/) &&
            !text.includes('Sauté') &&
            !text.includes('Add') &&
            !text.includes('Heat') &&
            !text.includes('Cook') &&
            !text.includes('Mix') &&
            !text.includes('Stir') &&
            !text.includes('Bake') &&
            !text.includes('Roast') &&
            !text.includes('Grill') &&
            !text.includes('Boil') &&
            !text.includes('Simmer') &&
            !text.includes('Fry') &&
            !text.includes('Melt') &&
            !text.includes('Whisk') &&
            !text.includes('Pour') &&
            !text.includes('Combine') &&
            !text.includes('Place') &&
            !text.includes('Transfer') &&
            !text.includes('Remove') &&
            !text.includes('Return') &&
            !text.includes('Serve') &&
            !text.includes('Enjoy') &&
            !text.includes('Let') &&
            !text.includes('Set') &&
            !text.includes('Allow') &&
            !text.includes('Continue') &&
            !text.includes('Repeat') &&
            !text.includes('Finish') &&
            // Must look like an ingredient
            (text.match(/\d+\s*(cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|ounce|ounces|pound|pounds|lb|lbs|kg|g|gram|grams|ml|liter|liter|pinch|dash|clove|cloves)/i) || 
             text.match(/^(salt|pepper|oil|butter|flour|sugar|egg|eggs|milk|water|cheese|onion|garlic|tomato|potato|carrot|celery|lettuce|bread|rice|pasta|chicken|beef|pork|fish)/i) ||
             text.match(/^\d+\s*\//) || // Fractions like "1/2"
             text.match(/^[A-Z][a-z]/)) && // Start with capital letter
            text.split(' ').length <= 10) { // Reasonable word count
          ingredients.push(text);
        }
      });
    }

    return ingredients;
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
   * Extract time information - Pinch of Yum specific
   * @param {cheerio} $ - Cheerio DOM parser
   * @param {string} type - Time type: 'prep', 'cook', or 'total'
   * @returns {string} Time string or empty
   */
  getTime($, type) {
    const selectors = [
      `.wprm-recipe-${type}-time`,
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
   * Extract servings information - Pinch of Yum specific
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string} Servings info or empty
   */
  getServings($) {
    const selectors = [
      '.wprm-recipe-servings',
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
   * Extract publication date
   * @param {cheerio} $ - Cheerio DOM parser
   * @returns {string} Date string or empty
   */
  getDatePublished($) {
    const selectors = [
      '[itemprop="datePublished"]',
      '.published',
      '.post-date',
      'time[datetime]',
      '.entry-date'
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
  saveToFile(filename = 'pinch-of-yum-vegetarian-recipes-v3.json') {
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
   * Scrape all vegetarian recipes from Pinch of Yum
   * @returns {Object[]} Array of scraped recipes
   */
  async scrapeAllVegetarianRecipes() {
    const vegetarianUrl = 'https://pinchofyum.com/recipes/vegetarian';
    
    // First, extract all recipe URLs
    const recipeUrls = await this.extractRecipeUrls(vegetarianUrl);
    
    if (recipeUrls.length === 0) {
      console.log('No recipe URLs found');
      return [];
    }

    console.log(`Starting to scrape ${recipeUrls.length} vegetarian recipes...`);
    
    // Scrape each recipe with delays
    for (let i = 0; i < recipeUrls.length; i++) {
      const url = recipeUrls[i];
      await this.scrapeRecipe(url);
      
      // Respectful delay between requests
      if (i < recipeUrls.length - 1) {
        console.log(`Waiting ${this.delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    console.log(`Complete: ${this.recipes.length} vegetarian recipes scraped`);
    return this.recipes;
  }
}

// Main execution
async function main() {
  const scraper = new PinchOfYumScraperV3();
  
  console.log('Starting Pinch of Yum vegetarian recipe scraper v3 (structured data)...');
  
  await scraper.scrapeAllVegetarianRecipes();
  scraper.saveToFile();
  
  console.log('Scraping complete!');
}

// Export for module use
module.exports = PinchOfYumScraperV3;

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
