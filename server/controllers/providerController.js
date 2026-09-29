const Provider = require('../models/Provider');

// @desc    Get all providers
// @route   GET /api/providers
// @access  Public
exports.getProviders = async (req, res, next) => {
  try {
    const { service, search, lat, lng, radius } = req.query;
    
    if (lat && lng) {
      const radiusKm = parseInt(radius, 10) || 50;
      const maxDistanceMeters = radiusKm * 1000;
      const mongoose = require('mongoose');

      const pipeline = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: 'distanceMeters',
            maxDistance: maxDistanceMeters,
            spherical: true
          }
        }
      ];

      // Match providers that have coordinates set (default is [0,0], we might want to filter real ones)
      pipeline.push({
        $match: { 'location.coordinates': { $ne: [0, 0] } }
      });

      if (service) {
        pipeline.push({
          $match: { services: new mongoose.Types.ObjectId(service) }
        });
      }

      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { professionalName: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      // Filter by provider's service radius (ensure distance is within provider's radius)
      pipeline.push({
        $match: {
          $expr: {
            $lte: ['$distanceMeters', { $multiply: [{ $ifNull: ['$serviceRadius', 10] }, 1000] }]
          }
        }
      });

      pipeline.push(
        { $lookup: { from: 'services', localField: 'services', foreignField: '_id', as: 'services' } },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
      );

      const providers = await Provider.aggregate(pipeline);
      
      const formattedProviders = providers.map(p => ({
        ...p,
        user: p.user ? { _id: p.user._id, name: p.user.name } : null
      }));

      return res.status(200).json({ success: true, count: formattedProviders.length, data: formattedProviders });
    }

    // Standard fallback query when no location provided
    let query = {};
    
    if (service) {
      query.services = service;
    }
    
    if (search) {
      query.$or = [
        { professionalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const providers = await Provider.find(query)
      .populate('services', 'name category icon')
      .populate('user', 'name'); 
      
    res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single provider
// @route   GET /api/providers/:id
// @access  Public
exports.getProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('services', 'name category icon')
      .populate('user', 'name');
      
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update provider location
// @route   PUT /api/providers/location
// @access  Private (Provider)
exports.updateLocation = async (req, res, next) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ success: false, message: 'Only providers can update location' });
    }

    const { latitude, longitude, serviceRadius } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }

    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    provider.location = {
      type: 'Point',
      coordinates: [lng, lat] // MongoDB stores as [longitude, latitude]
    };

    if (serviceRadius !== undefined) {
      const radius = parseFloat(serviceRadius);
      if (isNaN(radius) || radius < 1 || radius > 100) {
        return res.status(400).json({ success: false, message: 'Service radius must be between 1 and 100 km' });
      }
      provider.serviceRadius = radius;
    }

    await provider.save();

    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
