import mongoose from 'mongoose';
import { Doctor } from '../models/doctor.model.js';
import { Patient } from '../models/patient.model.js';

function isValidObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

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

export async function listAllPatients(request, response) {
  const page = readPositiveInteger(request.query.page, 1, 1_000_000);
  const limit = readPositiveInteger(request.query.limit, 20, 100);

  if (page === null || limit === null) {
    return response.status(400).json({ message: 'Use a page between 1 and 1000000 and a limit between 1 and 100.' });
  }

  const { q, condition, doctorId, from, to } = request.query;

  const query = {};

  if (typeof q === 'string' && q.trim()) {
    query.name = new RegExp(escapeRegex(q.trim()), 'i');
  }

  if (typeof condition === 'string' && condition.trim()) {
    query.condition = new RegExp(`^${escapeRegex(condition.trim())}$`, 'i');
  }

  if (typeof doctorId === 'string') {
    if (!isValidObjectId(doctorId)) {
      return response.status(400).json({ message: 'Invalid doctor ID format.' });
    }
    query.doctorId = new mongoose.Types.ObjectId(doctorId);
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
      dateQuery.$lt = new Date(toDate.getTime() + 86_400_000);
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      return response.status(400).json({ message: 'The "from" date cannot be after the "to" date.' });
    }

    query.createdAt = dateQuery;
  }

  const [patients, total] = await Promise.all([
    Patient.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('doctorId', 'name specialization hospital')
      .lean(),
    Patient.countDocuments(query),
  ]);

  return response.json({
    data: patients,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function updatePatient(request, response) {
  const { patientId } = request.params;

  if (!isValidObjectId(patientId)) {
    return response.status(400).json({ message: 'Invalid patient ID.' });
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    return response.status(404).json({ message: 'Patient not found.' });
  }

  const body = request.body;
  const allowedFields = new Set(['name', 'condition', 'phone']);
  if (
    body === null
    || typeof body !== 'object'
    || Array.isArray(body)
    || Object.keys(body).length === 0
    || Object.keys(body).some((field) => !allowedFields.has(field))
  ) {
    return response.status(400).json({ message: 'Provide one or more valid patient fields to update.' });
  }

  const { name, condition, phone } = body;

  if (name !== undefined) {
    if (typeof name !== 'string') {
      return response.status(400).json({ message: 'Invalid patient details.', errors: { name: 'Name must be a string.' } });
    }
    patient.name = name;
  }

  if (condition !== undefined) {
    if (typeof condition !== 'string') {
      return response.status(400).json({ message: 'Invalid patient details.', errors: { condition: 'Condition must be a string.' } });
    }
    patient.condition = condition;
  }

  if (phone !== undefined) {
    if (phone === null) {
      patient.phone = null;
    } else if (typeof phone === 'string' && phone.trim().length > 0) {
      patient.phone = phone.trim();
    } else if (typeof phone === 'string' && phone.trim().length === 0) {
      patient.phone = null;
    } else {
      return response.status(400).json({ message: 'Invalid patient details.', errors: { phone: 'Phone must be a string or null.' } });
    }
  }

  try {
    await patient.save();
    await patient.populate('doctorId', 'name specialization');
    return response.json({ data: patient.toObject() });
  } catch (error) {
    if (!(error instanceof mongoose.Error.ValidationError)) throw error;

    const errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, issue]) => [field, issue.message]),
    );
    return response.status(400).json({ message: 'Invalid patient details.', errors });
  }
}

export async function deletePatient(request, response) {
  const { patientId } = request.params;

  if (!isValidObjectId(patientId)) {
    return response.status(400).json({ message: 'Invalid patient ID.' });
  }

  const result = await Patient.deleteOne({ _id: new mongoose.Types.ObjectId(patientId) });

  if (result.deletedCount === 0) {
    return response.status(404).json({ message: 'Patient not found.' });
  }

  return response.status(204).end();
}

export async function getPatientMeta(request, response) {
  const [conditions, doctors] = await Promise.all([
    Patient.distinct('condition'),
    Doctor.find({}, { name: 1, specialization: 1 }).sort({ name: 1 }).lean(),
  ]);

  return response.json({
    data: {
      conditions: conditions.filter(Boolean).sort(),
      doctors: doctors.map((d) => ({ _id: d._id, name: d.name, specialization: d.specialization })),
    },
  });
}
