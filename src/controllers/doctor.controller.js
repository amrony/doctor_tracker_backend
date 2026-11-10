import mongoose from 'mongoose';
import { Doctor, doctorFieldNames } from '../models/doctor.model.js';

function readPositiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;

  const number = Number(value);
  return number <= max ? number : null;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
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

  const query = {};

  const { q, specialization, hospital, from, to } = request.query;

  if (typeof q === 'string' && q.trim()) {
    const regex = new RegExp(escapeRegex(q.trim()), 'i');
    query.$or = [
      { name: regex },
      { specialization: regex },
      { hospital: regex },
    ];
  }

  if (typeof specialization === 'string' && specialization.trim()) {
    query.specialization = new RegExp(`^${escapeRegex(specialization.trim())}$`, 'i');
  }

  if (typeof hospital === 'string' && hospital.trim()) {
    query.hospital = new RegExp(`^${escapeRegex(hospital.trim())}$`, 'i');
  }

  if (from !== undefined || to !== undefined) {
    const dateQuery = {};

    let fromDate = null;
    let toDate = null;

    if (from !== undefined) {
      fromDate = parseCalendarDate(from);
      if (!fromDate) {
        return response.status(400).json({ message: 'The "from" date must be a valid calendar date in YYYY-MM-DD format.' });
      }
      dateQuery.$gte = fromDate;
    }

    if (to !== undefined) {
      toDate = parseCalendarDate(to);
      if (!toDate) {
        return response.status(400).json({ message: 'The "to" date must be a valid calendar date in YYYY-MM-DD format.' });
      }
      // Exclusive midnight of next UTC day
      dateQuery.$lt = new Date(toDate.getTime() + 86_400_000);
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      return response.status(400).json({ message: 'The "from" date cannot be after the "to" date.' });
    }

    query.createdAt = dateQuery;
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Doctor.countDocuments(query),
  ]);

  return response.json({
    data: doctors,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
