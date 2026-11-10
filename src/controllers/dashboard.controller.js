import { Doctor } from '../models/doctor.model.js';
import { Patient } from '../models/patient.model.js';

const supportedPeriods = new Set([7, 30, 90]);
const millisecondsPerDay = 86_400_000;

function getUtcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardAnalytics(request, response) {
  const rawDays = request.query.days;
  const days = rawDays === undefined ? 30 : Number(rawDays);
  if (
    (rawDays !== undefined && (typeof rawDays !== 'string' || !/^\d+$/.test(rawDays)))
    || !supportedPeriods.has(days)
  ) {
    return response.status(400).json({ message: 'Choose a dashboard period of 7, 30, or 90 days.' });
  }

  const today = new Date();
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const startDate = new Date(endDate.getTime() - days * millisecondsPerDay);

  const [doctors, patientStats] = await Promise.all([
    Doctor.aggregate([
      {
        $lookup: {
          from: Patient.collection.name,
          let: { doctorId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$doctorId', '$$doctorId'] } } },
            { $count: 'count' },
          ],
          as: 'patientCounts',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          specialization: 1,
          patientCount: { $ifNull: [{ $arrayElemAt: ['$patientCounts.count', 0] }, 0] },
        },
      },
      { $sort: { patientCount: -1, name: 1, _id: 1 } },
    ]),
    Patient.aggregate([
      {
        $facet: {
          totals: [{ $count: 'count' }],
          daily: [
            { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]),
  ]);

  const dailyCounts = new Map((patientStats[0]?.daily ?? []).map(({ _id, count }) => [_id, count]));
  const patientTrend = Array.from({ length: days }, (_value, index) => {
    const date = new Date(startDate.getTime() + index * millisecondsPerDay);
    const dateKey = getUtcDateKey(date);
    return { date: dateKey, count: dailyCounts.get(dateKey) ?? 0 };
  });

  return response.json({
    data: {
      totals: {
        doctors: doctors.length,
        patients: patientStats[0]?.totals[0]?.count ?? 0,
      },
      patientsByDoctor: doctors.map(({ _id, name, specialization, patientCount }) => ({
        doctorId: _id,
        doctorName: name,
        specialization,
        patientCount,
      })),
      patientTrend,
      periodDays: days,
    },
  });
}
