import mongoose from 'mongoose';
import { Doctor, doctorFieldNames } from '../models/doctor.model.js';

function readPositiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;

  const number = Number(value);
  return number <= max ? number : null;
}

export async function createDoctor(request, response) {
  const fields = {};
  for (const field of doctorFieldNames) {
    const value = request.body?.[field];
    if (typeof value === 'string') fields[field] = value;
  }

  try {
    const doctor = await Doctor.create(fields);
    return response.status(201).json({ data: doctor });
  } catch (error) {
    if (!(error instanceof mongoose.Error.ValidationError)) throw error;

    const errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, issue]) => [field, issue.message]),
    );
    return response.status(400).json({ message: 'Invalid doctor details.', errors });
  }
}

export async function listDoctors(request, response) {
  const page = readPositiveInteger(request.query.page, 1, 1_000_000);
  const limit = readPositiveInteger(request.query.limit, 20, 100);

  if (page === null || limit === null) {
    return response.status(400).json({ message: 'Use a page between 1 and 1000000 and a limit between 1 and 100.' });
  }

  const [doctors, total] = await Promise.all([
    Doctor.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Doctor.countDocuments(),
  ]);

  return response.json({
    data: doctors,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
