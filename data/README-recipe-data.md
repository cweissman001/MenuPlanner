# Pinch of Yum Vegetarian Recipe Data

## Overview
This dataset contains **120 vegetarian recipes** scraped from Pinch of Yum, cleaned and normalized for product matching.

## Files
- `pinch-of-yum-vegetarian-recipes-v3.json` - Raw scraped data with structured JSON-LD extraction
- `pinch-of-yum-vegetarian-recipes-cleaned.json` - **Cleaned data ready for product matching**

## Data Structure (Cleaned Version)

Each recipe contains:
```json
{
  "url": "https://pinchofyum.com/recipe-url",
  "title": "Recipe Title",
  "description": "Recipe description",
  "ingredients": [
    {
      "original": "1/2 cup canned chickpeas",
      "core": "chickpeas", 
      "cleaned": "1/2 cup canned chickpeas"
    }
  ],
  "prepTime": "15 minutes",
  "cookTime": "30 minutes", 
  "totalTime": "45 minutes",
  "servings": "4 servings",
  "category": "Vegetarian",
  "datePublished": "2020-09-08",
  "scrapedAt": "2026-03-28T02:33:45.707Z"
}
```

## Ingredient Fields Explained

- **`original`**: The ingredient as extracted from structured data
- **`core`**: The essential ingredient name (quantities, prep instructions removed)
- **`cleaned`**: HTML entities and instructional text removed

## Cleaning Process

1. **HTML Entity Cleanup**: Removed `&#8211;`, `&#8217;`, etc. and replaced with proper characters
2. **Instruction Removal**: Filtered out non-ingredient text like:
   - "ideally, a pre-made slaw bag mix!"
   - "otherwise: thinly sliced cabbage + mayo..."
   - "any other toppings you like – I'd recommend..."
3. **Core Extraction**: Identified the essential ingredient for product matching:
   - "1/2 cup canned chickpeas" → "chickpeas"
   - "2 cloves garlic" → "garlic"
   - "1 tablespoon brown sugar" → "brown sugar"
4. **Quality Filtering**: Removed incomplete ingredients (like "14") and non-food items

## Product Matching Strategy

Use the `core` field for matching to grocery products:
- `core: "chickpeas"` → Match to "Canned Chickpeas"
- `core: "olive oil"` → Match to "Extra Virgin Olive Oil"
- `core: "brown sugar"` → Match to "Brown Sugar"

The `original` field preserves quantity information for recipe calculations.

## Statistics
- **Total Recipes**: 120
- **Valid Recipes After Cleaning**: 120
- **Average Ingredients per Recipe**: ~10-12
- **Date Range**: Various (scraped 2026-03-28)

## Sample Recipes
- BBQ Jackfruit Sandwiches
- Cauliflower Walnut Vegetarian Taco Meat
- Instant Pot Wild Rice Soup
- Buffalo Cauliflower Tacos with Avocado Crema
- Spiced Chickpea and Couscous Bowls

## Usage
```javascript
const recipes = require('./pinch-of-yum-vegetarian-recipes-cleaned.json');

// Extract all unique core ingredients for product catalog
const uniqueIngredients = [...new Set(
  recipes.flatMap(r => r.ingredients.map(i => i.core).filter(Boolean))
)];

// Find recipes using a specific ingredient
const chickpeaRecipes = recipes.filter(r => 
  r.ingredients.some(i => i.core === 'chickpeas')
);
```
