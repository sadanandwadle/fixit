const Provider = require('../models/Provider');

// @desc    Get all providers
// @route   GET /api/providers
// @access  Public
exports.getProviders = async (req, res, next) => {
  try {
    const { service, search } = req.query;
    
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
      .populate('user', 'name'); // Ensure not to expose sensitive user data
      
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
