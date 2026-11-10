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

export async function getDoctorById(request, response) {
  const { doctorId } = request.params;
  if (!isValidObjectId(doctorId)) {
    return response.status(400).json({ message: 'Invalid doctor ID.' });
  }

  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) {
    return response.status(404).json({ message: 'Doctor not found.' });
  }

  return response.json({ data: doctor });
}

export async function listDoctorPatients(request, response) {
  const { doctorId } = request.params;
  if (!isValidObjectId(doctorId)) {
    return response.status(400).json({ message: 'Invalid doctor ID.' });
  }

  const doctorExists = await Doctor.exists({ _id: doctorId });
  if (!doctorExists) {
    return response.status(404).json({ message: 'Doctor not found.' });
  }

  const page = readPositiveInteger(request.query.page, 1, 1_000_000);
  const limit = readPositiveInteger(request.query.limit, 20, 100);

  if (page === null || limit === null) {
    return response.status(400).json({ message: 'Use a page between 1 and 1000000 and a limit between 1 and 100.' });
  }

  const query = { doctorId: new mongoose.Types.ObjectId(doctorId) };
  const { q, condition, from, to } = request.query;

  if (typeof q === 'string' && q.trim()) {
    query.name = new RegExp(escapeRegex(q.trim()), 'i');
  }

  if (typeof condition === 'string' && condition.trim()) {
    query.condition = new RegExp(`^${escapeRegex(condition.trim())}$`, 'i');
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
    Patient.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Patient.countDocuments(query),
  ]);

  return response.json({
    data: patients,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function createDoctorPatient(request, response) {
  const { doctorId } = request.params;
  if (!isValidObjectId(doctorId)) {
    return response.status(400).json({ message: 'Invalid doctor ID.' });
  }

  const doctorExists = await Doctor.exists({ _id: doctorId });
  if (!doctorExists) {
    return response.status(404).json({ message: 'Doctor not found.' });
  }

  const payload = { doctorId: new mongoose.Types.ObjectId(doctorId) };
  if (typeof request.body?.name === 'string') payload.name = request.body.name;
  if (typeof request.body?.condition === 'string') payload.condition = request.body.condition;
  if (typeof request.body?.phone === 'string' && request.body.phone.trim().length > 0) {
    payload.phone = request.body.phone;
  }

  try {
    const patient = await Patient.create(payload);
    return response.status(201).json({ data: patient });
  } catch (error) {
    if (!(error instanceof mongoose.Error.ValidationError)) throw error;

    const errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, issue]) => [field, issue.message]),
    );
    return response.status(400).json({ message: 'Invalid patient details.', errors });
  }
}

export async function deleteDoctorPatient(request, response) {
  const { doctorId, patientId } = request.params;
  if (!isValidObjectId(doctorId) || !isValidObjectId(patientId)) {
    return response.status(400).json({ message: 'Invalid ID format.' });
  }

  const result = await Patient.deleteOne({
    _id: new mongoose.Types.ObjectId(patientId),
    doctorId: new mongoose.Types.ObjectId(doctorId),
  });

  if (result.deletedCount === 0) {
    return response.status(404).json({ message: 'Patient not found for this doctor.' });
  }

  return response.status(204).end();
}

