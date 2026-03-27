const axios = require('axios');

class KrogerService {
  constructor() {
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.baseURL = process.env.KROGER_API_BASE_URL || 'https://api.kroger.com/v1';
    this.currentToken = null;
    this.tokenExpiry = null;
  }

  checkCredentials() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Kroger API credentials required');
    }
  }

  async getValidToken() {
    this.checkCredentials();
    
    if (this.currentToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.currentToken.access_token;
    }

    await this.refreshToken();
    return this.currentToken.access_token;
  }

  async refreshToken() {
    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const tokenURL = 'https://api.kroger.com/v1/connect/oauth2/token';

    try {
      const formData = 'grant_type=client_credentials&scope=product.compact';
      
      const response = await axios.post(
        tokenURL,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')}`,
          },
        }
      );

      this.currentToken = response.data;
      this.tokenExpiry = Date.now() + (this.currentToken.expires_in - 300) * 1000;
    } catch (error) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchProducts({ searchTerm, locationId, limit = 10 }) {
    const token = await this.getValidToken();
    
    const params = new URLSearchParams({
      'filter.locationId': locationId,
      'filter.limit': limit.toString(),
      'filter.fulfillment': 'csp', // Add this to get pricing data
    });

    if (searchTerm) {
      params.append('filter.term', searchTerm);
    }

    const response = await axios.get(`${this.baseURL}/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data || [];
  }

  async findSaleItems({ searchTerm, locationId, limit = 50 }) {
    const products = await this.searchProducts({ searchTerm, locationId, limit });
  
    return products.filter(product => {
      return product.items?.some(item => {
        const regular = item.price?.regular;
        const promo = item.price?.promo;
        return regular && promo && promo < regular;
      });
    }).map(product => {
      const saleItem = product.items.find(item => 
        item.price?.promo && item.price.promo < item.price.regular
      );
      
      return {
        productId: product.productId,
        description: product.description,
        brand: product.brand,
        regularPrice: saleItem.price.regular,
        salePrice: saleItem.price.promo,
        savings: (saleItem.price.regular - saleItem.price.promo).toFixed(2),
        size: saleItem.size,
      };
    });
  }

  async findLocations(zipCode, radiusInMiles = 10) {
    const token = await this.getValidToken();
    
    const params = new URLSearchParams({
      'filter.zipCode.near': zipCode,
      'filter.limit': '10',
      'filter.radiusInMiles': radiusInMiles.toString(),
      // 'filter.chain': 'Kroger', // Temporarily removed for debugging
    });

    const response = await axios.get(`${this.baseURL}/locations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data || [];
  }

  async findLocationById(locationId) {
    const token = await this.getValidToken();
    
    const response = await axios.get(`${this.baseURL}/locations/${locationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data || null;
  }
}

module.exports = { krogerService: new KrogerService() };
