const { krogerService } = require('./kroger.service');

class SaleAnalysisService {
  async getBestSales(locationId, options = {}) {
    const {
      limit = 50,
      sortBy = 'percentage', // 'percentage', 'savings', 'both'
      category = null,
      minSavings = 0.5 // Minimum savings in dollars
    } = options;

    console.log(`🔍 Analyzing sales for location ${locationId}...`);
    console.log(`   Options: limit=${limit}, sortBy=${sortBy}, category=${category}, minSavings=${minSavings}`);
    
    try {
      // Get products by searching common grocery terms, then filter for sales
      // The Kroger API requires a search term
      const searchTerms = ['chicken', 'beef', 'milk', 'bread', 'cheese', 'vegetables', 'fruit', 'pasta'];
      let allProducts = [];
      
      for (const term of searchTerms) {
        try {
          const products = await krogerService.searchProducts({
            searchTerm: term,
            locationId,
            limit: Math.ceil((limit * 4) / searchTerms.length) // Get more to find sales
          });
          
          // Filter for products that have sale prices and keep full product data
          const saleProducts = products.filter(product => 
            product.items && 
            product.items.some(item => 
              item.price && 
              item.price.promo && 
              item.price.promo < item.price.regular
            )
          ).map(product => {
            const saleItem = product.items.find(item => 
              item.price && 
              item.price.promo && 
              item.price.promo < item.price.regular
            );
            
            return {
              // Keep full product data for accurate categorization
              productId: product.productId,
              description: product.description,
              brand: product.brand,
              categories: product.categories || [],
              taxonomies: product.taxonomies || [],
              regularPrice: saleItem.price.regular,
              salePrice: saleItem.price.promo,
              savings: (saleItem.price.regular - saleItem.price.promo).toFixed(2),
              size: saleItem.size,
              soldBy: saleItem.soldBy,
              nutritionInformation: product.nutritionInformation,
              allergens: product.allergens,
              manufacturerDeclarations: product.manufacturerDeclarations
            };
          });
          
          allProducts = allProducts.concat(saleProducts);
        } catch (err) {
          console.log(`   Search term "${term}" failed, trying next...`);
        }
      }
      
      // Remove duplicates based on productId
      const uniqueItems = allProducts.filter((item, index, self) =>
        index === self.findIndex((t) => t.productId === item.productId)
      );

      console.log(`   Found ${uniqueItems.length} unique items on sale`);

      // Filter by minimum savings
      let filteredItems = uniqueItems.filter(item => {
        const savings = parseFloat(item.savings);
        return savings >= minSavings;
      });

      // Filter by category if specified
      if (category) {
        filteredItems = filteredItems.filter(item => {
          const itemCategory = this.categorizeItem(item);
          
          // Check if the item's category matches the requested category
          if (itemCategory === category) {
            return true;
          }
          
          // Also check if the original Kroger category matches (case-insensitive)
          if (item.categories && item.categories.length > 0) {
            const krogerCategory = item.categories[0].toLowerCase();
            const requestedCategory = category.toLowerCase();
            
            // Map common variations
            const categoryMappings = {
              'dairy': ['dairy'],
              'protein': ['meat', 'seafood', 'protein'],
              'vegetables': ['produce'],
              'fruits': ['produce'],
              'grains': ['bakery'],
              'frozen': ['frozen'],
              'pantry': ['pantry'],
              'beverages': ['beverages'],
              'snacks': ['snacks']
            };
            
            const mappedCategories = categoryMappings[requestedCategory] || [requestedCategory];
            return mappedCategories.some(mapped => krogerCategory.includes(mapped));
          }
          
          return false;
        });
      }

      console.log(`   After filtering: ${filteredItems.length} items`);

      // Calculate additional metrics
      const analyzedItems = filteredItems.map(item => {
        const regularPrice = parseFloat(item.regularPrice);
        const salePrice = parseFloat(item.salePrice);
        const savings = parseFloat(item.savings);
        const percentageDiscount = ((regularPrice - salePrice) / regularPrice * 100).toFixed(1);

        return {
          ...item,
          percentageDiscount: parseFloat(percentageDiscount),
          savingsAmount: savings,
          pricePerUnit: this.calculatePricePerUnit(item),
          category: this.categorizeItem(item.description)
        };
      });

      // Sort based on preference
      let sortedItems;
      switch (sortBy) {
        case 'percentage':
          sortedItems = analyzedItems.sort((a, b) => b.percentageDiscount - a.percentageDiscount);
          break;
        case 'savings':
          sortedItems = analyzedItems.sort((a, b) => b.savingsAmount - a.savingsAmount);
          break;
        case 'both':
          // Sort by a combination of percentage and absolute savings
          sortedItems = analyzedItems.sort((a, b) => {
            const scoreA = a.percentageDiscount * 0.6 + (a.savingsAmount / 10) * 0.4;
            const scoreB = b.percentageDiscount * 0.6 + (b.savingsAmount / 10) * 0.4;
            return scoreB - scoreA;
          });
          break;
        default:
          sortedItems = analyzedItems;
      }

      return sortedItems.slice(0, limit);
    } catch (error) {
      console.error('❌ Error in getBestSales:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      throw error;
    }
  }

  calculatePricePerUnit(item) {
    // Simple price per unit calculation based on size
    const size = item.size || '';
    const price = parseFloat(item.salePrice);
    
    // Extract numeric value and unit from size
    const sizeMatch = size.match(/(\d+\.?\d*)\s*(lb|oz|gal|qt|pt|ct|ea|fl oz)/i);
    if (!sizeMatch) return null;

    const [, quantity, unit] = sizeMatch;
    const numQuantity = parseFloat(quantity);
    
    // Convert to standard units
    if (unit.toLowerCase() === 'lb') {
      // Price per pound
      return (price / numQuantity).toFixed(2) + '/lb';
    } else if (unit.toLowerCase() === 'oz') {
      // Price per ounce
      return (price / numQuantity).toFixed(3) + '/oz';
    } else if (unit.toLowerCase() === 'gal') {
      // Price per gallon
      return (price / numQuantity).toFixed(2) + '/gal';
    } else if (unit.toLowerCase() === 'qt') {
      // Price per quart
      return (price / numQuantity).toFixed(2) + '/qt';
    } else if (unit.toLowerCase() === 'pt') {
      // Price per pint
      return (price / numQuantity).toFixed(2) + '/pt';
    } else if (unit.toLowerCase() === 'fl oz') {
      // Price per fluid ounce
      return (price / numQuantity).toFixed(3) + '/fl oz';
    } else if (unit.toLowerCase() === 'ct' || unit.toLowerCase() === 'ea') {
      // Price per item
      return (price / numQuantity).toFixed(2) + '/each';
    }
    
    return null;
  }

  categorizeItem(product) {
    // Use Kroger's built-in categories first
    if (product.categories && product.categories.length > 0) {
      const krogerCategory = product.categories[0]; // Use primary category
      
      // Map Kroger categories to meal planning categories
      const categoryMapping = {
        'Dairy': 'dairy',
        'Meat': 'protein',
        'Produce': 'produce', // Will be refined to vegetables/fruits below
        'Bakery': 'grains',
        'Frozen': 'frozen',
        'Pantry': 'pantry',
        'Beverages': 'beverages',
        'Snacks': 'snacks',
        'Seafood': 'protein',
        'Deli': 'prepared_foods',
        'Household': 'other',
        'Personal Care': 'other'
      };
      
      const mappedCategory = categoryMapping[krogerCategory];
      if (mappedCategory) {
        // Further refine produce category
        if (mappedCategory === 'produce') {
          return this.refineProduceCategory(product);
        }
        return mappedCategory;
      }
    }
    
    // Fallback to taxonomy-based categorization
    if (product.taxonomies && product.taxonomies.length > 0) {
      const taxonomy = product.taxonomies[0];
      const subCommodity = taxonomy.subCommodity?.name;
      
      if (subCommodity) {
        const taxonomyMapping = {
          // Protein
          'Beef': 'protein',
          'Chicken': 'protein',
          'Pork': 'protein',
          'Turkey': 'protein',
          'Fish & Seafood': 'protein',
          'Eggs': 'protein',
          
          // Vegetables
          'Fresh Vegetables': 'vegetables',
          'Frozen Vegetables': 'vegetables',
          'Canned Vegetables': 'pantry',
          
          // Fruits
          'Fresh Fruit': 'fruits',
          'Frozen Fruit': 'frozen',
          'Canned Fruit': 'pantry',
          
          // Dairy
          'Milk & Milk Substitutes': 'dairy',
          'Cheese': 'dairy',
          'Yogurt': 'dairy',
          'Butter & Margarine': 'dairy',
          
          // Grains
          'Bread & Bakery': 'grains',
          'Cereal & Breakfast Foods': 'grains',
          'Pasta & Rice': 'grains',
          
          // Pantry
          'Canned Goods': 'pantry',
          'Condiments & Sauces': 'pantry',
          'Spices & Seasonings': 'herbs_spices',
          'Baking Supplies': 'pantry',
          
          // Beverages
          'Juices': 'beverages',
          'Soda & Carbonated Beverages': 'beverages',
          'Coffee & Tea': 'beverages',
          'Water': 'beverages'
        };
        
        const mappedCategory = taxonomyMapping[subCommodity];
        if (mappedCategory) {
          return mappedCategory;
        }
      }
    }
    
    // Final fallback to description-based categorization
    return this.categorizeByDescription(product.description);
  }
  
  refineProduceCategory(product) {
    const description = (product.description || '').toLowerCase();
    
    // Check for fruits
    const fruits = ['apple', 'banana', 'orange', 'berry', 'strawberry', 'blueberry', 'grape', 'melon', 'pineapple', 'mango', 'peach', 'pear', 'cherry', 'kiwi', 'lemon', 'lime'];
    if (fruits.some(fruit => description.includes(fruit))) {
      return 'fruits';
    }
    
    // Default to vegetables
    return 'vegetables';
  }
  
  categorizeByDescription(description) {
    if (!description) return 'other';
    
    const desc = description.toLowerCase();
    
    // Protein category
    if (desc.includes('beef') || desc.includes('chicken') || desc.includes('pork') || desc.includes('turkey') || 
        desc.includes('fish') || desc.includes('salmon') || desc.includes('shrimp') || desc.includes('meat') ||
        desc.includes('ground') || desc.includes('steak') || desc.includes('breast') || desc.includes('thighs') ||
        desc.includes('sausage') || desc.includes('bacon') || desc.includes('ham') || desc.includes('eggs') ||
        desc.includes('tofu') || desc.includes('tempeh')) {
      return 'protein';
    }
    
    // Vegetables category
    if (desc.includes('vegetable') || desc.includes('carrot') || desc.includes('lettuce') || desc.includes('tomato') ||
        desc.includes('onion') || desc.includes('potato') || desc.includes('broccoli') || desc.includes('cauliflower') ||
        desc.includes('spinach') || desc.includes('pepper') || desc.includes('cucumber') || desc.includes('celery') ||
        desc.includes('corn') || desc.includes('green beans') || desc.includes('asparagus') || desc.includes('zucchini') ||
        desc.includes('squash') || desc.includes('mushroom') || desc.includes('garlic') || desc.includes('avocado')) {
      return 'vegetables';
    }
    
    // Fruits category
    if (desc.includes('fruit') || desc.includes('apple') || desc.includes('banana') || desc.includes('berry') ||
        desc.includes('strawberry') || desc.includes('blueberry') || desc.includes('orange') || desc.includes('lemon') ||
        desc.includes('grape') || desc.includes('melon') || desc.includes('pineapple') || desc.includes('mango') ||
        desc.includes('peach') || desc.includes('pear') || desc.includes('cherry') || desc.includes('kiwi')) {
      return 'fruits';
    }
    
    // Grains category
    if (desc.includes('bread') || desc.includes('rice') || desc.includes('pasta') || desc.includes('cereal') ||
        desc.includes('oat') || desc.includes('granola') || desc.includes('flour') || desc.includes('quinoa') ||
        desc.includes('barley') || desc.includes('tortilla') || desc.includes('bagel') || desc.includes('cracker') ||
        desc.includes('toast') || desc.includes('bun') || desc.includes('roll') || desc.includes('pancake')) {
      return 'grains';
    }
    
    // Dairy category
    if (desc.includes('milk') || desc.includes('cheese') || desc.includes('yogurt') || desc.includes('butter') ||
        desc.includes('cream') || desc.includes('sour cream') || desc.includes('cottage cheese') || desc.includes('cream cheese') ||
        desc.includes('ice cream') || desc.includes('dairy') || desc.includes('lactaid') || desc.includes('half & half')) {
      return 'dairy';
    }
    
    // Pantry category
    if (desc.includes('oil') || desc.includes('vinegar') || desc.includes('sauce') || desc.includes('soup') ||
        desc.includes('canned') || desc.includes('beans') || desc.includes('tomato sauce') || desc.includes('pasta sauce') ||
        desc.includes('salsa') || desc.includes('mustard') || desc.includes('ketchup') || desc.includes('mayo') ||
        desc.includes('sugar') || desc.includes('salt') || desc.includes('pepper') || desc.includes('flour') ||
        desc.includes('rice') || desc.includes('pasta') || desc.includes('cereal') || desc.includes('oatmeal')) {
      return 'pantry';
    }
    
    // Frozen category
    if (desc.includes('frozen') || desc.includes('ice cream') || desc.includes('frozen pizza') || desc.includes('frozen dinner') ||
        desc.includes('frozen vegetables') || desc.includes('frozen fruit') || desc.includes('frozen meal') ||
        desc.includes('waffles') || desc.includes('frozen pancakes') || desc.includes('frozen dessert')) {
      return 'frozen';
    }
    
    // Herbs & Spices category
    if (desc.includes('herb') || desc.includes('spice') || desc.includes('basil') || desc.includes('oregano') ||
        desc.includes('thyme') || desc.includes('rosemary') || desc.includes('cinnamon') || desc.includes('cumin') ||
        desc.includes('paprika') || desc.includes('garlic powder') || desc.includes('onion powder') || desc.includes('seasoning') ||
        desc.includes('spice blend') || desc.includes('herb blend') || desc.includes('dried')) {
      return 'herbs_spices';
    }
    
    // Snacks category
    if (desc.includes('snack') || desc.includes('chip') || desc.includes('cracker') || desc.includes('pretzel') ||
        desc.includes('popcorn') || desc.includes('nuts') || desc.includes('trail mix') || desc.includes('granola bar') ||
        desc.includes('fruit snack') || desc.includes('jerky') || desc.includes('cheese curl') || desc.includes('dip')) {
      return 'snacks';
    }
    
    // Prepared Foods category
    if (desc.includes('deli') || desc.includes('prepared') || desc.includes('rotisserie') || desc.includes('salad bar') ||
        desc.includes('hot bar') || desc.includes('ready meal') || desc.includes('takeout') || desc.includes('sandwich') ||
        desc.includes('wraps') || desc.includes('pizza') || desc.includes('sub') || desc.includes('burrito')) {
      return 'prepared_foods';
    }
    
    // Beverages category
    if (desc.includes('drink') || desc.includes('juice') || desc.includes('soda') || desc.includes('water') ||
        desc.includes('coffee') || desc.includes('tea') || desc.includes('sports drink') || desc.includes('energy drink') ||
        desc.includes('lemonade') || desc.includes('iced tea') || desc.includes('smoothie') || desc.includes('milk')) {
      return 'beverages';
    }
    
    return 'other';
  }

  async getTopDealsByCategory(locationId, limit = 5) {
    const bestSales = await this.getBestSales(locationId, { limit: 100 });
    
    // Group by category
    const categoryGroups = {};
    bestSales.forEach(item => {
      const category = item.category;
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(item);
    });

    // Get top deal from each category
    const topDeals = {};
    Object.keys(categoryGroups).forEach(category => {
      topDeals[category] = categoryGroups[category]
        .sort((a, b) => b.percentageDiscount - a.percentageDiscount)[0];
    });

    return topDeals;
  }

  formatSaleAnalysis(items) {
    if (items.length === 0) {
      return 'No great deals found right now.';
    }

    let output = `\nBEST DEALS ANALYSIS\n`;
    output += `${'='.repeat(50)}\n\n`;

    items.forEach((item, index) => {
      output += `${index + 1}. ${item.description}\n`;
      output += `   Brand: ${item.brand || 'N/A'}\n`;
      output += `   Category: ${item.category}\n`;
      output += `   Regular: $${item.regularPrice} → Sale: $${item.salePrice}\n`;
      output += `   Save: $${item.savingsAmount} (${item.percentageDiscount}% off)\n`;
      
      if (item.pricePerUnit) {
        output += `   Price per unit: $${item.pricePerUnit}\n`;
      }
      
      if (item.size) {
        output += `   Size: ${item.size}\n`;
      }
      
      output += '\n';
    });

    // Summary statistics
    const totalSavings = items.reduce((sum, item) => sum + item.savingsAmount, 0);
    const avgDiscount = items.reduce((sum, item) => sum + item.percentageDiscount, 0) / items.length;
    
    output += `${'='.repeat(50)}\n`;
    output += `SUMMARY:\n`;
    output += `   Total potential savings: $${totalSavings.toFixed(2)}\n`;
    output += `   Average discount: ${avgDiscount.toFixed(1)}%\n`;
    output += `   Number of deals: ${items.length}\n`;

    return output;
  }
}

module.exports = { saleAnalysisService: new SaleAnalysisService() };
