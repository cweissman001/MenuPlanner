process.env.KROGER_CLIENT_ID = 'test-client-id';
process.env.KROGER_CLIENT_SECRET = 'test-client-secret';
process.env.KROGER_API_BASE_URL = 'https://api-ce.kroger.com/v1';

const axios = require('axios');
const { krogerService } = require('../services/kroger.service');

jest.mock('axios');

describe('KrogerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    krogerService.currentToken = null;
    krogerService.tokenExpiry = null;
  });

  describe('token management', () => {
    test('should fetch new token when none exists', async () => {
      const mockToken = {
        access_token: 'test-token-123',
        expires_in: 1800,
      };

      axios.post.mockResolvedValueOnce({ data: mockToken });

      await krogerService.getValidToken();

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/connect/oauth2/token'),
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
          }),
        })
      );
    });

    test('should reuse existing token if not expired', async () => {
      krogerService.currentToken = { access_token: 'cached-token' };
      krogerService.tokenExpiry = Date.now() + 60000;

      const token = await krogerService.getValidToken();

      expect(token).toBe('cached-token');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('findLocations', () => {
    test('should call Kroger API with correct params', async () => {
      const mockToken = { access_token: 'token', expires_in: 1800 };
      const mockLocations = [
        { locationId: '001', name: 'Kroger - Main St' },
      ];

      axios.post.mockResolvedValueOnce({ data: mockToken });
      axios.get.mockResolvedValueOnce({ data: { data: mockLocations } });

      const result = await krogerService.findLocations('45202', 10);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('locations'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token' },
        })
      );
      expect(result).toEqual(mockLocations);
    });
  });

  describe('searchProducts', () => {
    test('should call Kroger API with search term', async () => {
      const mockToken = { access_token: 'token', expires_in: 1800 };
      const mockProducts = [{ productId: '123', description: 'Milk' }];

      axios.post.mockResolvedValueOnce({ data: mockToken });
      axios.get.mockResolvedValueOnce({ data: { data: mockProducts } });

      const result = await krogerService.searchProducts({
        searchTerm: 'milk',
        locationId: '001',
        limit: 5,
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('products'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token' },
        })
      );
      expect(result).toEqual(mockProducts);
    });
  });
});
