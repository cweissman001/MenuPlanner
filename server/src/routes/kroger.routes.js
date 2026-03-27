const express = require('express');
const { krogerService } = require('../services/kroger.service');

const router = express.Router();

router.get('/locations', async (req, res) => {
  try {
    const { zipCode, radiusInMiles } = req.query;

    if (!zipCode) {
      return res.status(400).json({ error: 'zipCode required' });
    }

    const locations = await krogerService.findLocations(
      zipCode,
      radiusInMiles ? parseInt(radiusInMiles, 10) : 10
    );

    res.json({ data: locations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/locations/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId required' });
    }

    const location = await krogerService.findLocationById(locationId);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/search', async (req, res) => {
  try {
    const { locationId, term, limit } = req.query;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId required' });
    }

    const products = await krogerService.searchProducts({
      searchTerm: term,
      locationId,
      limit: limit ? parseInt(limit, 10) : 10,
    });

    res.json({ data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/sale', async (req, res) => {
  try {
    const { locationId, term, limit } = req.query;

    if (!locationId) {
      return res.status(400).json({ error: 'locationId required' });
    }

    const saleItems = await krogerService.findSaleItems({
      searchTerm: term,
      locationId,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    res.json({
      data: saleItems,
      count: saleItems.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
