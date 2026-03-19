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
    
    const tokenURL = this.baseURL.includes('api-ce') 
      ? 'https://api-ce.kroger.com/v1/connect/oauth2/token'
      : 'https://api.kroger.com/v1/connect/oauth2/token';

    const response = await axios.post(
      tokenURL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'product.compact',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authString}`,
        },
      }
    );

    this.currentToken = response.data;
    this.tokenExpiry = Date.now() + (this.currentToken.expires_in - 300) * 1000;
  }

  async searchProducts({ searchTerm, locationId, limit = 10 }) {
    const token = await this.getValidToken();
    
    const params = new URLSearchParams({
      'filter.locationId': locationId,
      'filter.limit': limit.toString(),
    });

    if (searchTerm) {
      params.append('filter.term', searchTerm);
    }

    const response = await axios.get(`${this.baseURL}/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data || [];
  }

  async findLocations(zipCode, radiusInMiles = 10) {
    const token = await this.getValidToken();
    
    const params = new URLSearchParams({
      'filter.zipCode.near': zipCode,
      'filter.limit': '10',
      'filter.radiusInMiles': radiusInMiles.toString(),
      'filter.chain': 'Kroger',
    });

    const response = await axios.get(`${this.baseURL}/locations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.data || [];
  }
}

module.exports = { krogerService: new KrogerService() };
