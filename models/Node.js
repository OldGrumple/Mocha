const mongoose = require('mongoose');
const crypto = require('crypto');

const NodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  apiKey: { 
    type: String,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  certificate: {
    publicKey: String,
    privateKey: String,
    generatedAt: Date
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  lastSeen: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Method to generate new API key
NodeSchema.methods.generateNewApiKey = function() {
  this.apiKey = crypto.randomBytes(32).toString('hex');
  return this.apiKey;
};

// Method to generate new certificate pair
NodeSchema.methods.generateCertificatePair = function() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  this.certificate = {
    publicKey,
    privateKey,
    generatedAt: new Date()
  };

  return this.certificate;
};

module.exports = mongoose.model('Node', NodeSchema);