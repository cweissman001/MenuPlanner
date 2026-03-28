#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class RecipeDataCleaner {
  constructor() {
    this.cleanedRecipes = [];
  }

  /**
   * Clean HTML entities from text
   * @param {string} text - Text with HTML entities
   * @returns {string} Cleaned text
   */
  cleanHtmlEntities(text) {
    return text
      .replace(/&#8211;/g, '-') // en dash
      .replace(/&#8212;/g, '—') // em dash
      .replace(/&#8216;/g, "'") // left single quote
      .replace(/&#8217;/g, "'") // right single quote
      .replace(/&#8220;/g, '"') // left double quote
      .replace(/&#8221;/g, '"') // right double quote
      .replace(/&#8230;/g, '...') // ellipsis
      .replace(/&amp;/g, '&') // ampersand
      .replace(/&lt;/g, '<') // less than
      .replace(/&gt;/g, '>') // greater than
      .replace(/&quot;/g, '"') // quote
      .replace(/&#39;/g, "'") // apostrophe
      .replace(/&nbsp;/g, ' ') // non-breaking space
      .replace(/&#\d+;/g, ''); // remove any other numeric entities
  }

  /**
   * Clean and normalize ingredient text for product matching
   * @param {string} ingredient - Raw ingredient text
   * @returns {string|null} Cleaned ingredient or null if not a real ingredient
   */
  cleanIngredient(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') return null;

    let cleaned = ingredient.trim();
    
    // Clean HTML entities
    cleaned = this.cleanHtmlEntities(cleaned);
    
    // Remove common instruction phrases
    const instructionPatterns = [
      /^ideally,? /i,
      /^otherwise:? /i,
      /^if you want,? /i,
      /^optional:? /i,
      /^or /i,
      /^plus /i,
      /^and /i,
      /^for serving:? /i,
      /^for topping:? /i,
      /^garnish:? /i,
      /^any other /i,
      /^i'd recommend /i,
      /^i like /i, // Remove brand preferences
      /to taste$/i,
      /as needed$/i,
      /optional$/i,
      /to serve$/i,
      /etc\.?$/i
    ];

    instructionPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove text in parentheses that are clearly instructions or brand preferences
    cleaned = cleaned.replace(/\([^)]*(ideally|optional|or|if|for|plus|and|any|recommend|like|prefer|brand|i like)[^)]*\)/gi, '');
    
    // Don't split on commas for ingredients that might contain commas in the name
    // Only split if there are clear instructional separators
    if (cleaned.match(/(ideally|otherwise|otherwise|for|plus|and|or|any|recommend|like|prefer|brand)/i)) {
      cleaned = cleaned.split(/[,\-–—]/)[0].trim();
    }
    
    // Remove quantities and focus on the actual ingredient name
    // Keep basic measurements but remove excessive detail
    cleaned = cleaned
      .replace(/\b(divided|optional|to taste|as needed|for serving|for garnish)\b/gi, '')
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim();

    // Filter out non-ingredient content
    const nonIngredientPatterns = [
      /^ideally /i,
      /^otherwise /i,
      /^any other /i,
      /^i'd recommend /i,
      /^toasted buns?$/i, // buns are more like equipment/base
      /^pre-made /i,
      /^store-bought /i,
      /^homemade /i,
      /toppings?$/i,
      /servings?$/i,
      /^\d+$/ // Just numbers (like "14" from incomplete parsing)
    ];

    for (const pattern of nonIngredientPatterns) {
      if (pattern.test(cleaned)) {
        return null;
      }
    }

    // If it's too short or too long, it's probably not a real ingredient
    if (cleaned.length < 2 || cleaned.length > 100) {
      return null;
    }

    // If it contains instructional words, filter it out
    const instructionalWords = [
      'ideally', 'otherwise', 'recommend', 'like', 'prefer', 'suggest',
      'toast', 'pre-made', 'store-bought', 'homemade'
    ];
    
    if (instructionalWords.some(word => cleaned.toLowerCase().includes(word))) {
      return null;
    }

    return cleaned || null;
  }

  /**
   * Extract core ingredient name (remove quantities, prep instructions)
   * @param {string} ingredient - Cleaned ingredient
   * @returns {string} Core ingredient name
   */
  extractCoreIngredient(ingredient) {
    if (!ingredient) return '';

    // Remove quantities at the beginning (more comprehensive)
    let core = ingredient.replace(/^[\d\/\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+(?:-?\s*[\d\/\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)?\s*(?:cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|ounce|ounces|pound|pounds|lb|lbs|kg|g|gram|grams|ml|liter|liter|pinch|dash|clove|cloves|can|cans|jar|jars|bottle|bottles|package|packages|bag|bags|box|boxes|head|heads|bunch|bunches|stalk|stalks)?\b/gi, '').trim();

    // Remove package descriptors
    core = core.replace(/^(canned|fresh|frozen|dried|jarred|packaged|organic|regular|large|small|medium|extra|more|less|one|two|three|four|five|six|seven|eight|nine|ten)\s+/gi, '');

    // Remove preparation instructions
    core = core.replace(/\b(chopped|diced|minced|grated|shredded|sliced|crushed|ground|melted|softened|room temperature|cold|warm|hot|cooked|uncooked|raw|ripe|unripe|dried|canned|jarred|packaged|organic|regular|large|small|medium|extra|more|less|divided|optional)\b/gi, '').trim();

    // Remove parenthetical notes
    core = core.replace(/\([^)]*\)/g, '').trim();

    // Remove measurement words that might remain
    core = core.replace(/\b(cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|ounce|ounces|pound|pounds|lb|lbs|kg|g|gram|grams|ml|liter|liter|pinch|dash|clove|cloves|can|cans|jar|jars|bottle|bottles|package|packages|bag|bags|box|boxes|head|heads|bunch|bunches|stalk|stalks)\b/gi, '').trim();

    // Clean up extra whitespace and remove trailing prepositions
    core = core.replace(/\s+/g, ' ').replace(/\b(of|for|with|and|or)\s*$/gi, '').trim();

    // Remove any remaining numbers at the beginning
    core = core.replace(/^[\d\/\s\-]+/, '').trim();

    // If the core is too short, return the original cleaned version
    if (core.length < 2) {
      return ingredient;
    }

    return core;
  }

  /**
   * Clean a single recipe
   * @param {Object} recipe - Raw recipe object
   * @returns {Object} Cleaned recipe object
   */
  cleanRecipe(recipe) {
    const cleanedRecipe = { ...recipe };

    // Clean ingredients
    if (Array.isArray(recipe.ingredients)) {
      cleanedRecipe.ingredients = recipe.ingredients
        .map(ing => this.cleanIngredient(ing))
        .filter(ing => ing !== null)
        .map(ing => ({
          original: ing,
          core: this.extractCoreIngredient(ing),
          cleaned: this.cleanHtmlEntities(ing)
        }));
    }

    // Clean other text fields
    ['title', 'description'].forEach(field => {
      if (cleanedRecipe[field]) {
        cleanedRecipe[field] = this.cleanHtmlEntities(cleanedRecipe[field]);
      }
    });

    // Normalize time format (convert PT15M to "15 minutes")
    ['prepTime', 'cookTime', 'totalTime'].forEach(field => {
      if (cleanedRecipe[field] && cleanedRecipe[field].startsWith('PT')) {
        const match = cleanedRecipe[field].match(/PT(\d+)(M|H)/);
        if (match) {
          const value = match[1];
          const unit = match[2] === 'H' ? 'hour' : 'minute';
          cleanedRecipe[field] = `${value} ${unit}${value > 1 ? 's' : ''}`;
        }
      }
    });

    // Normalize servings (convert array to string)
    if (Array.isArray(cleanedRecipe.servings)) {
      cleanedRecipe.servings = cleanedRecipe.servings[0] || '';
    }

    return cleanedRecipe;
  }

  /**
   * Load and clean recipe data
   * @param {string} inputFile - Path to input JSON file
   * @param {string} outputFile - Path to output JSON file
   */
  async cleanRecipeData(inputFile, outputFile) {
    try {
      console.log(`Loading recipes from: ${inputFile}`);
      
      const rawData = fs.readFileSync(inputFile, 'utf8');
      const recipes = JSON.parse(rawData);
      
      console.log(`Processing ${recipes.length} recipes...`);
      
      this.cleanedRecipes = recipes.map(recipe => this.cleanRecipe(recipe));
      
      // Remove recipes that have no ingredients after cleaning
      const validRecipes = this.cleanedRecipes.filter(recipe => 
        recipe.ingredients && recipe.ingredients.length > 0
      );
      
      console.log(`Cleaned ${validRecipes.length} valid recipes (removed ${recipes.length - validRecipes.length} invalid recipes)`);
      
      // Save cleaned data
      fs.writeFileSync(outputFile, JSON.stringify(validRecipes, null, 2));
      console.log(`Saved cleaned recipes to: ${outputFile}`);
      
      // Show sample of cleaned ingredients
      if (validRecipes.length > 0) {
        console.log('\n=== Sample of cleaned ingredients ===');
        const sampleRecipe = validRecipes[0];
        console.log(`Recipe: ${sampleRecipe.title}`);
        sampleRecipe.ingredients.slice(0, 5).forEach((ing, i) => {
          console.log(`${i + 1}. "${ing.original}" -> "${ing.core}"`);
        });
      }
      
    } catch (error) {
      console.error(`Error cleaning recipe data: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const cleaner = new RecipeDataCleaner();
  
  const inputFile = path.join(__dirname, '..', 'data', 'pinch-of-yum-vegetarian-recipes-v3.json');
  const outputFile = path.join(__dirname, '..', 'data', 'pinch-of-yum-vegetarian-recipes-cleaned.json');
  
  await cleaner.cleanRecipeData(inputFile, outputFile);
  
  console.log('\nRecipe data cleaning complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RecipeDataCleaner;
