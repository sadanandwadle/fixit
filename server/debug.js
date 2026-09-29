const mongoose = require('mongoose');
const Provider = require('./models/Provider');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/fixit_dev').then(async () => {
  const jane = await Provider.findOne({ professionalName: /Jane/i }).populate('user');
  console.log('Jane:', jane.user.email);
  
  const seed2 = await Provider.findOne().populate({ path: 'user', match: { email: 'seed_provider2@test.com' } });
  
  const allProvs = await Provider.find().populate('user');
  for (const p of allProvs) {
    if (p.user && p.user.email) {
      console.log(p.professionalName, '->', p.user.email, '-> Location:', p.location.coordinates);
    }
  }
  
  mongoose.connection.close();
});
