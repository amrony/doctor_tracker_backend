import mongoose from 'mongoose';

const fieldLimits = {
  name: 120,
  specialization: 120,
  hospital: 160,
  phone: 32,
  email: 254,
};

export const doctorFieldNames = Object.keys(fieldLimits);

function requiredText(maxLength) {
  const message = `Enter a value between 1 and ${maxLength} characters.`;
  return { type: String, trim: true, required: [true, message], maxlength: [maxLength, message] };
}

const doctorSchema = new mongoose.Schema({
  name: requiredText(fieldLimits.name),
  specialization: requiredText(fieldLimits.specialization),
  hospital: requiredText(fieldLimits.hospital),
  phone: requiredText(fieldLimits.phone),
  email: {
    ...requiredText(fieldLimits.email),
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
  },
}, {
  collection: 'doctors',
  timestamps: { updatedAt: false },
  versionKey: false,
  autoCreate: false,
});

export const Doctor = mongoose.model('Doctor', doctorSchema);
