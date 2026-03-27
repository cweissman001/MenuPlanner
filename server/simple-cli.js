#!/usr/bin/env node

// Load environment variables first
require('dotenv').config();

const { krogerService } = require('./src/services/kroger.service');
const { saleAnalysisService } = require('./src/services/sale-analysis.service');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function showMenu() {
  console.log('\nKroger Service CLI Menu');
  console.log('============================');
  console.log('1. Find stores by zip code');
  console.log('2. Get store details by ID');
  console.log('3. Search products');
  console.log('4. Find sale items');
  console.log('5. Best sales analysis');
  console.log('6. Exit');
  console.log('');
}

let lastStoreId = '';

async function findStoresByZip() {
  const zipCode = await question('Enter zip code: ');
  if (!zipCode.trim()) return;
  
  const radiusStr = await question('Enter search radius in miles (default 10): ') || '10';
  const radius = parseInt(radiusStr);
  
  console.log('\nFinding stores using krogerService.findLocations()...');
  console.log(`   Searching with zipCode: ${zipCode}, radius: ${radius} miles`);
  try {
    const locations = await krogerService.findLocations(zipCode, radius);
    
    console.log(`   API returned ${locations.length} locations`);
    
    if (locations.length === 0) {
      console.log('No stores found');
      console.log('Try increasing the radius or a different zip code');
      return;
    }
    
    console.log(`\nFound ${locations.length} stores:`);
    locations.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name}`);
      console.log(`   ID: ${store.locationId}`);
      console.log(`   Address: ${store.address.addressLine1}, ${store.address.city}, ${store.address.state} ${store.address.zipCode}`);
      console.log(`   Phone: ${store.phone}`);
      console.log('');
    });
    
    if (locations.length > 0) {
      lastStoreId = locations[0].locationId;
      console.log(`Store ID ${locations[0].locationId} saved for easy access`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function getStoreById() {
  const locationId = await question(`Enter store ID (or press Enter for last store: ${lastStoreId}): `);
  const storeId = locationId.trim() || lastStoreId;
  if (!storeId) {
    console.log('No store ID provided');
    return;
  }
  
  console.log(`\nGetting store ${storeId} using krogerService.findLocationById()...`);
  try {
    const location = await krogerService.findLocationById(storeId);
    
    if (!location) {
      console.log('Store not found');
      return;
    }
    
    console.log(`\n${location.name}`);
    console.log(`   ID: ${location.locationId}`);
    console.log(`   Address: ${location.address.addressLine1}`);
    console.log(`   ${location.address.city}, ${location.address.state} ${location.address.zipCode}`);
    console.log(`   Phone: ${location.phone}`);
    
    if (location.hours && location.hours.monday) {
      console.log(`   Hours: ${location.hours.monday.open} - ${location.hours.monday.close} (Mon-Fri)`);
    }
    
    lastStoreId = storeId;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function searchProducts() {
  const locationId = await question(`Enter store ID (or press Enter for last store: ${lastStoreId}): `);
  const storeId = locationId.trim() || lastStoreId;
  if (!storeId) {
    console.log('No store ID provided');
    return;
  }
  
  const searchTerm = await question('Enter search term: ');
  if (!searchTerm.trim()) return;
  
  const limit = await question('Enter limit (default 10): ') || '10';
  
  console.log(`\nSearching for "${searchTerm}" using krogerService.searchProducts()...`);
  console.log(`   Parameters: locationId=${storeId}, searchTerm="${searchTerm}", limit=${limit}`);
  
  try {
    const products = await krogerService.searchProducts({
      searchTerm,
      locationId: storeId,
      limit: parseInt(limit)
    });
    
    if (products.length === 0) {
      console.log('No products found');
      return;
    }
    
    console.log(`\nFound ${products.length} products:`);
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.description}`);
      console.log(`   Brand: ${product.brand || 'N/A'}`);
      console.log(`   Product ID: ${product.productId}`);
      if (product.items && product.items[0]) {
        console.log(`   Size: ${product.items[0].size || 'N/A'}`);
        if (product.items[0].price) {
          console.log(`   Price: $${product.items[0].price.regular || 'N/A'}`);
        }
      }
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function findSaleItems() {
  const locationId = await question(`Enter store ID (or press Enter for last store: ${lastStoreId}): `);
  const storeId = locationId.trim() || lastStoreId;
  if (!storeId) {
    console.log('No store ID provided');
    return;
  }
  
  const searchTerm = await question('Enter search term (optional, press Enter for all): ') || '';
  const limit = await question('Enter limit (default 20): ') || '20';
  
  console.log(`\nFinding sale items using krogerService.findSaleItems()...`);
  console.log(`   Parameters: locationId=${storeId}, searchTerm="${searchTerm}", limit=${limit}`);
  
  try {
    const saleItems = await krogerService.findSaleItems({
      searchTerm,
      locationId: storeId,
      limit: parseInt(limit)
    });
    
    if (saleItems.length === 0) {
      console.log('No sale items found');
      return;
    }
    
    console.log(`\nFound ${saleItems.length} items on sale:`);
    let totalSavings = 0;
    
    saleItems.forEach((item, index) => {
      const savings = parseFloat(item.savings);
      totalSavings += savings;
      
      console.log(`${index + 1}. ${item.description}`);
      console.log(`   Brand: ${item.brand || 'N/A'}`);
      console.log(`   Regular: $${item.regularPrice}`);
      console.log(`   Sale: $${item.salePrice}`);
      console.log(`   You save: $${item.savings}`);
      if (item.size) {
        console.log(`   Size: ${item.size}`);
      }
      console.log('');
    });
    
    console.log(`Total potential savings: $${totalSavings.toFixed(2)}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function analyzeBestSales() {
  const locationId = await question(`Enter store ID (or press Enter for last store: ${lastStoreId}): `);
  const storeId = locationId.trim() || lastStoreId;
  if (!storeId) {
    console.log('No store ID provided');
    return;
  }
  
  console.log('\nSALES ANALYSIS OPTIONS');
  console.log('Sort by:');
  console.log('1. Percentage discount (best % off)');
  console.log('2. Dollar savings (most money saved)');
  console.log('3. Combined score (best overall value)');
  
  const sortChoice = await question('Choose sort method (1-3, default 3): ') || '3';
  
  let sortBy;
  switch (sortChoice) {
    case '1': sortBy = 'percentage'; break;
    case '2': sortBy = 'savings'; break;
    case '3': 
    default: sortBy = 'both'; break;
  }
  
  console.log('\nAvailable categories for filtering:');
  console.log('protein, vegetables, fruits, grains, dairy, pantry, frozen, herbs_spices, snacks, prepared_foods, beverages');
  
  const category = await question('Filter by category (optional, press Enter for all): ') || '';
  const minSavings = await question('Minimum savings in dollars (default 0.50): ') || '0.50';
  const limit = await question('Number of results to show (default 15): ') || '15';
  
  console.log(`\nAnalyzing best sales using saleAnalysisService.getBestSales()...`);
  console.log(`   Parameters: locationId=${storeId}, sortBy=${sortBy}, category="${category}", minSavings=$${minSavings}`);
  
  try {
    const bestSales = await saleAnalysisService.getBestSales(storeId, {
      sortBy,
      category: category || null,
      minSavings: parseFloat(minSavings),
      limit: parseInt(limit)
    });
    
    const analysis = saleAnalysisService.formatSaleAnalysis(bestSales);
    console.log(analysis);
    
    // Ask if user wants top deals by category
    const showByCategory = await question('\nShow top deal by category? (y/n, default n): ') || 'n';
    if (showByCategory.toLowerCase() === 'y') {
      console.log('\nTOP DEALS BY CATEGORY');
      console.log('='.repeat(40));
      
      const topDealsByCategory = await saleAnalysisService.getTopDealsByCategory(storeId);
      Object.keys(topDealsByCategory).forEach(category => {
        const deal = topDealsByCategory[category];
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`   ${deal.description}`);
        console.log(`   $${deal.regularPrice} → $${deal.salePrice} (Save $${deal.savings}, ${deal.percentageDiscount}% off)`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('Starting Kroger Service CLI...');
  console.log('This interacts directly with the KrogerService class methods');
  
  while (true) {
    await showMenu();
    const choice = await question('Enter your choice (1-6): ');
    
    switch (choice.trim()) {
      case '1':
        await findStoresByZip();
        break;
      case '2':
        await getStoreById();
        break;
      case '3':
        await searchProducts();
        break;
      case '4':
        await findSaleItems();
        break;
      case '5':
        await analyzeBestSales();
        break;
      case '6':
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      default:
        console.log('Invalid choice. Please enter 1-6.');
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  rl.close();
  console.log('\nGoodbye!');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
