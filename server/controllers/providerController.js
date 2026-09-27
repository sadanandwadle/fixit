const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Service = require('../models/Service');

// @desc    Get all providers with filters (?service, ?search, ?verified)
// @route   GET /api/providers
// @access  Public
const getProviders = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable. Please verify MongoDB status.',
      });
    }

    const { service, search, verified } = req.query;
    const filter = {};

    if (verified === 'true') {
      filter.isVerified = true;
    }

    // Filter by service (can be category name or service ID or service name)
    if (service && service !== 'All') {
      let serviceDoc = null;
      if (mongoose.isValidObjectId(service)) {
        serviceDoc = await Service.findById(service);
      } else {
        // Find matching services by category or name
        const matchingServices = await Service.find({
          $or: [
            { category: new RegExp(`^${service}$`, 'i') },
            { name: new RegExp(service, 'i') },
          ],
        }).select('_id');

        if (matchingServices.length > 0) {
          filter.services = { $in: matchingServices.map((s) => s._id) };
        } else {
          // No matching services found
          return res.status(200).json({
            success: true,
            count: 0,
            data: [],
          });
        }
      }

      if (serviceDoc) {
        filter.services = serviceDoc._id;
      }
    }

    // Search query for business name or description
    if (search && search.trim()) {
      const q = search.trim();
      const userMatches = await User.find({
        name: { $regex: q, $options: 'i' },
        role: 'provider',
      }).select('_id');

      filter.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { serviceArea: { $regex: q, $options: 'i' } },
        { userId: { $in: userMatches.map((u) => u._id) } },
      ];
    }

    const providers = await Provider.find(filter)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description')
      .sort({ rating: -1, isVerified: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single provider by ID
// @route   GET /api/providers/:id
// @access  Public
const getProviderById = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider identifier format',
      });
    }

    const provider = await Provider.findById(req.params.id)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged-in provider profile
// @route   GET /api/providers/me
// @access  Private (Provider only)
const getMyProviderProfile = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    let provider = await Provider.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    // If provider record doesn't exist yet, auto-create one for this provider user
    if (!provider) {
      provider = await Provider.create({
        userId: req.user._id,
        businessName: `${req.user.name}'s Services`,
        description: 'Professional service provider on FIXIT.',
        services: [],
        serviceArea: req.user.address?.city ? [req.user.address.city] : [],
      });
      provider = await Provider.findById(provider._id)
        .populate('userId', 'name email phone profileImage address')
        .populate('services', 'name category basePrice icon description');
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update currently logged-in provider profile
// @route   PUT /api/providers/me
// @access  Private (Provider only)
const updateMyProviderProfile = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    let provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found for this account',
      });
    }

    const {
      businessName,
      description,
      experience,
      pricing,
      serviceArea,
      services,
      location,
      serviceRadius,
      address,
    } = req.body;

    // Validate and update fields
    if (businessName !== undefined) {
      if (!businessName || !businessName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Business name cannot be empty',
        });
      }
      provider.businessName = businessName.trim();
    }

    if (description !== undefined) {
      provider.description = description.trim();
    }

    if (experience !== undefined) {
      const expNum = Number(experience);
      if (isNaN(expNum) || expNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Experience must be a positive number',
        });
      }
      provider.experience = expNum;
    }

    if (pricing !== undefined) {
      provider.pricing = {
        hourlyRate: Math.max(0, Number(pricing.hourlyRate) || 0),
        startingPrice: Math.max(0, Number(pricing.startingPrice) || 0),
      };
    }

    if (serviceArea !== undefined) {
      if (Array.isArray(serviceArea)) {
        provider.serviceArea = serviceArea.map((a) => String(a).trim()).filter(Boolean);
      } else if (typeof serviceArea === 'string') {
        provider.serviceArea = serviceArea
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
      }
    }

    if (services !== undefined) {
      // Validate that each service is a valid ObjectId
      const validServiceIds = [];
      for (const sId of services) {
        const id = typeof sId === 'object' && sId !== null ? sId._id : sId;
        if (mongoose.isValidObjectId(id)) {
          validServiceIds.push(id);
        }
      }
      provider.services = validServiceIds;
    }

    if (location !== undefined && location.coordinates) {
      provider.location = location;
    }

    if (serviceRadius !== undefined) {
      const rad = Number(serviceRadius);
      if (!isNaN(rad) && rad >= 1 && rad <= 100) {
        provider.serviceRadius = rad;
      }
    }

    if (address && typeof address === 'object') {
      provider.address = {
        street: address.street !== undefined ? String(address.street).trim() : (provider.address?.street || ''),
        city: address.city !== undefined ? String(address.city).trim() : (provider.address?.city || ''),
        state: address.state !== undefined ? String(address.state).trim() : (provider.address?.state || ''),
        pincode: address.pincode !== undefined ? String(address.pincode).trim() : (provider.address?.pincode || ''),
        country: address.country !== undefined ? String(address.country).trim() : (provider.address?.country || 'India'),
      };
    }

    // Note: Do NOT allow modification of isVerified, rating, totalReviews or userId!
    await provider.save();

    const updated = await Provider.findById(provider._id)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create provider profile for authenticated provider if not yet existing
// @route   POST /api/providers/me
// @access  Private (Provider only)
const createMyProviderProfile = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const existing = await Provider.findOne({ userId: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile already exists for this account',
        data: existing,
      });
    }

    const { businessName, description, experience, pricing, serviceArea, services } = req.body;

    const provider = await Provider.create({
      userId: req.user._id,
      businessName: businessName?.trim() || `${req.user.name}'s Services`,
      description: description?.trim() || 'Professional service provider on FIXIT.',
      experience: Number(experience) || 0,
      pricing: pricing || { hourlyRate: 0, startingPrice: 0 },
      serviceArea: Array.isArray(serviceArea)
        ? serviceArea
        : serviceArea
        ? serviceArea.split(',').map((s) => s.trim())
        : [],
      services: Array.isArray(services) ? services.filter(mongoose.isValidObjectId) : [],
      isVerified: false, // Must always initialize to false
    });

    const populated = await Provider.findById(provider._id)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    res.status(201).json({
      success: true,
      message: 'Provider profile created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Helper for distance calculation (Haversine formula in km)
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

// @desc    Update provider location, address, and service radius
// @route   PUT /api/providers/me/location
// @access  Private (Provider only)
const updateMyLocation = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    let provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found for this account',
      });
    }

    const { latitude, longitude, serviceRadius, address, location } = req.body;

    // Support either direct latitude/longitude or location.coordinates [lng, lat]
    let lat = latitude;
    let lng = longitude;
    if (lat === undefined && location?.coordinates && Array.isArray(location.coordinates)) {
      lng = location.coordinates[0];
      lat = location.coordinates[1];
    }

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both latitude and longitude',
      });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    if (latNum < -90 || latNum > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90 degrees',
      });
    }

    if (lngNum < -180 || lngNum > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180 degrees',
      });
    }

    // GeoJSON coordinates standard: [longitude, latitude]
    provider.location = {
      type: 'Point',
      coordinates: [lngNum, latNum],
    };

    if (serviceRadius !== undefined) {
      const radiusNum = Number(serviceRadius);
      if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Service radius must be a number between 1 and 100 km',
        });
      }
      provider.serviceRadius = radiusNum;
    }

    if (address && typeof address === 'object') {
      provider.address = {
        street: address.street !== undefined ? String(address.street).trim() : (provider.address?.street || ''),
        city: address.city !== undefined ? String(address.city).trim() : (provider.address?.city || ''),
        state: address.state !== undefined ? String(address.state).trim() : (provider.address?.state || ''),
        pincode: address.pincode !== undefined ? String(address.pincode).trim() : (provider.address?.pincode || ''),
        country: address.country !== undefined ? String(address.country).trim() : (provider.address?.country || 'India'),
      };
    }

    await provider.save();

    const updated = await Provider.findById(provider._id)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    res.status(200).json({
      success: true,
      message: 'Provider location updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Find providers near a given latitude and longitude
// @route   GET /api/providers/nearby
// @access  Public
const getNearbyProviders = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }

    const { lat, lng, radius, service, verified } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and longitude (lng) query parameters are required',
      });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng must be valid numbers',
      });
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates out of bounds: lat must be [-90, 90], lng must be [-180, 180]',
      });
    }

    const radiusKm = Math.min(100, Math.max(1, Number(radius) || 15));
    const radiusMeters = radiusKm * 1000;

    const filter = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lngNum, latNum],
          },
          $maxDistance: radiusMeters,
        },
      },
    };

    if (verified === 'true') {
      filter.isVerified = true;
    }

    if (service && service !== 'All') {
      let serviceDoc = null;
      if (mongoose.isValidObjectId(service)) {
        serviceDoc = await Service.findById(service);
      } else {
        const matchingServices = await Service.find({
          $or: [
            { category: new RegExp(`^${service}$`, 'i') },
            { name: new RegExp(service, 'i') },
          ],
        }).select('_id');

        if (matchingServices.length > 0) {
          filter.services = { $in: matchingServices.map((s) => s._id) };
        } else {
          return res.status(200).json({
            success: true,
            count: 0,
            data: [],
            searchParams: { lat: latNum, lng: lngNum, radius: radiusKm },
          });
        }
      }

      if (serviceDoc) {
        filter.services = serviceDoc._id;
      }
    }

    const providers = await Provider.find(filter)
      .populate('userId', 'name email phone profileImage address')
      .populate('services', 'name category basePrice icon description');

    // Calculate distance and format results
    const results = [];
    for (const p of providers) {
      const pLng = p.location?.coordinates?.[0] ?? 0;
      const pLat = p.location?.coordinates?.[1] ?? 0;

      // Filter out unset default [0, 0] coordinates unless user explicitly searched near [0, 0]
      if (pLng === 0 && pLat === 0 && (Math.abs(latNum) > 1 || Math.abs(lngNum) > 1)) {
        continue;
      }

      const distance = calculateDistanceKm(latNum, lngNum, pLat, pLng);

      const pObj = p.toObject();
      pObj.distance = distance;
      pObj.inServiceRadius = distance <= (p.serviceRadius || 15);

      results.push(pObj);
    }

    // Sort by proximity
    results.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
      searchParams: {
        lat: latNum,
        lng: lngNum,
        radius: radiusKm,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProviders,
  getProviderById,
  getMyProviderProfile,
  updateMyProviderProfile,
  createMyProviderProfile,
  updateMyLocation,
  getNearbyProviders,
  calculateDistanceKm,
};
