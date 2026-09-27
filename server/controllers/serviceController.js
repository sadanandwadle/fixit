const mongoose = require('mongoose');
const Service = require('../models/Service');

const initialServices = [
  {
    name: 'Home Electrical Wiring & Repairs',
    category: 'Electrician',
    description: 'Complete electrical diagnostic, short circuit fixes, switchboard replacements, and wiring.',
    icon: 'Zap',
    basePrice: 299,
    status: 'active',
  },
  {
    name: 'Pipe Leakage & Drainage Repair',
    category: 'Plumber',
    description: 'Expert plumbing for leaking pipes, bathroom fittings, tap replacements, and clogged drains.',
    icon: 'Wrench',
    basePrice: 349,
    status: 'active',
  },
  {
    name: 'AC Servicing & Gas Refill',
    category: 'AC Technician',
    description: 'Deep AC foam wash, filter cleaning, cooling diagnostic, and eco-friendly gas refilling.',
    icon: 'Wind',
    basePrice: 599,
    status: 'active',
  },
  {
    name: 'Two-Wheeler & Car Maintenance',
    category: 'Mechanic',
    description: 'Doorstep vehicle checkup, engine oil change, brake adjustments, and emergency roadside inspection.',
    icon: 'Car',
    basePrice: 499,
    status: 'active',
  },
  {
    name: 'Full Home Deep Cleaning',
    category: 'Cleaner',
    description: 'Comprehensive kitchen, bathroom, and living room sanitization and deep machine scrubbing.',
    icon: 'Sparkles',
    basePrice: 799,
    status: 'active',
  },
  {
    name: 'Laptop & PC Hardware / OS Fix',
    category: 'Computer Repair',
    description: 'Diagnostic & repair for slow PCs, blue screens, SSD upgrades, and virus removal.',
    icon: 'Laptop',
    basePrice: 449,
    status: 'active',
  },
];

// @desc    Get all services with optional category/search filters
// @route   GET /api/services
// @access  Public
const getServices = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable. Please ensure MongoDB is running.',
      });
    }

    const { category, search } = req.query;
    const filter = { status: 'active' };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    let services = await Service.find(filter).sort({ category: 1, basePrice: 1 });

    // Seed database if empty
    if (services.length === 0 && !category && !search) {
      const count = await Service.countDocuments();
      if (count === 0) {
        services = await Service.insertMany(initialServices);
      }
    }

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res, next) => {
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
        message: 'Invalid service identifier format',
      });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new service
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
      });
    }
    const service = await Service.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed default services
// @route   POST /api/services/seed
// @access  Public (Utility for initial setup)
const seedServicesEndpoint = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Cannot seed: MongoDB is offline. Please start MongoDB or provide MONGODB_URI.',
      });
    }
    await Service.deleteMany({});
    const seeded = await Service.insertMany(initialServices);
    res.status(200).json({
      success: true,
      message: `Successfully seeded ${seeded.length} services`,
      data: seeded,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  seedServicesEndpoint,
  initialServices,
};
