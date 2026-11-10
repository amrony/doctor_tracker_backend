import mongoose from 'mongoose';
import { Doctor } from './doctor.model.js';

const patientSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: Doctor.modelName,
    required: [true, 'Select a doctor.'],
    immutable: true,
  },
  name: {
    type: String,
    trim: true,
    required: [true, 'Enter a patient name.'],
    maxlength: [120, 'Patient name cannot exceed 120 characters.'],
  },
  condition: {
    type: String,
    trim: true,
    required: [true, 'Enter the patient condition.'],
    maxlength: [160, 'Patient condition cannot exceed 160 characters.'],
  },
  phone: {
    type: String,
    trim: true,
    default: null,
    minlength: [1, 'Enter a phone number or leave it unset.'],
    maxlength: [32, 'Phone cannot exceed 32 characters.'],
  },
}, {
  collection: 'patients',
  timestamps: true,
  versionKey: false,
  autoCreate: false,
});

export const Patient = mongoose.model('Patient', patientSchema);
