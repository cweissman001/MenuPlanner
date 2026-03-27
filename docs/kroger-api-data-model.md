# Kroger API Data Model Reference

This document provides a comprehensive reference for the Kroger API product data structure, essential for meal planning development.

## Product Data Structure

### Root Level Product Object

```javascript
{
  "productId": "0001111041700",                    // Unique product identifier
  "productPageURI": "/p/kroger-2-reduced-fat-milk/0001111041700?cid=...",
  "aliasProductIds": ["0001111060903"],             // Alternative product IDs
  "brand": "Kroger",                               // Product brand
  "categories": ["Dairy"],                         // Built-in Kroger categories
  "countryOrigin": "United States",                // Country of origin
  "description": "Kroger 2% Reduced Fat Milk",     // Product description
  "upc": "0001111041700",                          // UPC barcode
  "alcohol": false,                                // Whether product contains alcohol
  "snapEligible": true,                            // SNAP eligibility
  "receiptDescription": "KROGER 2% RF MILK",      // Description on receipts
  "warnings": "KEEP REFRIGERATED",                 // Product warnings
}
```

### Built-in Categories (Kroger API)

The `categories` array contains Kroger's built-in categorization:
- `"Dairy"`
- `"Meat"` 
- `"Produce"`
- `"Bakery"`
- `"Frozen"`
- `"Pantry"`
- `"Beverages"`
- `"Snacks"`
- `"Household"`
- `"Personal Care"`
- etc.

### Taxonomy Structure (Detailed Categorization)

```javascript
"taxonomies": [
  {
    "department": {
      "code": "string",
      "name": "Grocery"                           // High-level department
    },
    "commodity": {
      "code": "string", 
      "name": "Beverages"                         // Product category
    },
    "subCommodity": {
      "code": "string",
      "name": "Milk & Milk Substitutes"          // Specific subcategory
    }
  }
]
```

### Item Information (Pricing & Inventory)

```javascript
"items": [
  {
    "itemId": "0001111041700",                    // Unique item identifier
    "inventory": {
      "stockLevel": "HIGH"                        // HIGH, MEDIUM, LOW, OUT
    },
    "favorite": true,                             // User favorite status
    "fulfillment": {
      "curbside": true,                           // Pickup availability
      "delivery": true,                           // Delivery availability  
      "instore": true,                            // In-store availability
      "shiptohome": true                          // Shipping availability
    },
    "price": {
      "regular": 1.99,                            // Regular price
      "promo": 1.59,                              // Sale/promotional price
      "regularPerUnitEstimate": 1.99,             // Price per unit (regular)
      "promoPerUnitEstimate": 1.59,               // Price per unit (sale)
      "expirationDate": {
        "value": "9999-12-31T00:00:00Z",         // Price expiration
        "timezone": "UTC"
      },
      "effectiveDate": {
        "value": "9999-12-31T00:00:00Z",         // Price effective date
        "timezone": "UTC"
      }
    },
    "nationalPrice": {                            // National pricing data
      "regular": 1.99,
      "promo": 1.59,
      "regularPerUnitEstimate": 1.99,
      "promoPerUnitEstimate": 1.59,
      "expirationDate": {...},
      "effectiveDate": {...}
    },
    "size": "1 gal",                              // Product size
    "soldBy": "unit"                              // Sold by: "unit", "weight", "volume"
  }
]
```

### Physical Properties

```javascript
"itemInformation": {
  "depth": "6",                                   // Physical dimensions (inches)
  "height": "10",                                 // Physical dimensions (inches)
  "width": "6",                                   // Physical dimensions (inches)
  "grossWeight": "8.82 [lb_av]",                  // Total weight
  "netWeight": "8.62 [lb_av]",                    // Net product weight
  "averageWeightPerUnit": "8.62 [lb_av]"
},
"temperature": {
  "indicator": "Refrigerated",                    // "Refrigerated", "Frozen", "Ambient"
  "heatSensitive": true                           // Heat sensitivity flag
}
```

### Aisle Location

```javascript
"aisleLocations": [
  {
    "bayNumber": "13",                            // Bay number
    "description": "Aisle 35",                     // Human-readable location
    "number": "35",                               // Aisle number
    "numberOfFacings": "5",                       // Product facings on shelf
    "sequenceNumber": "3",                        // Sequence in aisle
    "side": "L",                                  // Side: "L" or "R"
    "shelfNumber": "2",                           // Shelf level
    "shelfPositionInBay": "1"                     // Position in bay
  }
]
```

### Dietary & Allergen Information

```javascript
"manufacturerDeclarations": [
  "Live Naturally",
  "Kosher", 
  "Tree Nuts Free"
],
"sweeteningMethods": {
  "code": "UNSPECIFIED",
  "name": "Unspecified"
},
"allergens": [
  {
    "levelOfContainmentName": "Free from",
    "name": "Tree Nuts and Their Derivatives"
  }
],
"allergensDescription": "Free from Cereals and Their Derivatives.",
"certifiedForPassover": false,
"hypoallergenic": false,
"nonGmo": false,
"nonGmoClaimName": "PRODUCT LABELED WITH NON-GMO CLAIM",
"organicClaimName": "ORGANIC CLAIM AND PRINTED ON PACKAGE"
```

### Purchase Restrictions

```javascript
"retstrictions": {
  "maximumOrderQuantity": 10,                     // Max quantity per order
  "minimumOrderQuantity": 1,                      // Min quantity per order
  "postalCode": ["12345", "67890"],              // Restricted ZIP codes
  "shippable": false,                             // Can be shipped
  "stateCodes": ["CA", "NY"]                      // Restricted states
}
```

### Images

```javascript
"images": [
  {
    "id": "string",
    "perspective": "front",                        // "front", "back", "side", etc.
    "default": true,                              // Default product image
    "sizes": [
      {
        "id": "7df2d0a3-8349-44d4-9512-1dab89e675a9",
        "size": "medium",                         // "small", "medium", "large", "xlarge"
        "url": "https://www.kroger.com/product/images/medium/front/0001111041700"
      }
    ]
  }
]
```

### Ratings & Reviews

```javascript
"ratingsAndReviews": {
  "averageOverallRating": 4.5,                    // 1-5 star rating
  "totalReviewCount": 12                          // Number of reviews
}
```

### Nutrition Information

```javascript
"nutritionInformation": {
  "ingredientStatement": "\"Milk, skim milk, vitamin A palmitate, and vitamin D3.CONTAINS: MILK.",
  "dailyValueIntakeReference": "Percent Daily Values are based on a 2,000 calorie diet.",
  "servingSize": {
    "description": "8 fl oz (240mL)",
    "quantity": 240,
    "unitOfMeasure": {
      "abbreviation": "ml",
      "code": "MLT", 
      "name": "Millilitre"
    }
  },
  "nutrients": [
    {
      "code": "CA",                               // Nutrient code
      "description": "calcium",                   // Nutrient name
      "displayName": "Calcium",                   // Display name
      "percentDailyIntake": 25,                   // % daily value
      "quantity": 290,                            // Amount per serving
      "precision": {
        "code": "APPROXIMATELY",
        "name": "Approximately"
      },
      "unitOfMeasure": {
        "abbreviation": "mg",
        "code": "MGM",
        "name": "Milligram"
      }
    }
  ],
  "preparationState": {
    "code": "UNPREPARED",
    "name": "Unprepared"
  },
  "servingsPerPackage": {
    "description": "8.0 Exact",
    "value": 8
  },
  "nutritionalRating": "73"                       // Nutrition score (0-100)
}
```

## Meal Planning Implications

### Key Fields for Meal Planning:

1. **Categories**: Use built-in `categories` array for accurate categorization
2. **Taxonomy**: Use `taxonomies[0].subCommodity.name` for detailed meal planning categories
3. **Pricing**: Use `items[0].price.promo` for sale prices, `items[0].price.regular` for regular prices
4. **Size**: Use `items[0].size` for quantity calculations
5. **Nutrition**: Use `nutritionInformation` for dietary planning
6. **Allergens**: Use `allergens` array for dietary restrictions
7. **Inventory**: Use `items[0].inventory.stockLevel` for availability

### Meal Planning Category Mapping:

```javascript
// Map Kroger categories to meal planning categories
const categoryMapping = {
  "Dairy": "dairy",
  "Meat": "protein", 
  "Produce": "vegetables", // or "fruits" based on product
  "Bakery": "grains",
  "Frozen": "frozen",
  "Pantry": "pantry",
  "Beverages": "beverages",
  "Snacks": "snacks"
};

// Use subCommodity for more specific categorization
const subCommodityMapping = {
  "Milk & Milk Substitutes": "dairy",
  "Beef": "protein",
  "Chicken": "protein", 
  "Fresh Vegetables": "vegetables",
  "Fresh Fruit": "fruits",
  "Bread & Bakery": "grains"
};
```

### Sale Detection Logic:

```javascript
function isOnSale(product) {
  const item = product.items[0];
  return item.price && 
         item.price.promo && 
         item.price.promo < item.price.regular;
}

function getSavings(product) {
  const item = product.items[0];
  if (!isOnSale(product)) return 0;
  return item.price.regular - item.price.promo;
}
```

This data model provides comprehensive information for building intelligent meal planning features including sale detection, dietary filtering, and recipe matching.
