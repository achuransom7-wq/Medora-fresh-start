const { randomUUID } = require('crypto');
const db = require('./index');

const doctors = [
  { full_name: 'Dr. Elvis Nkeng', specialty: 'General Practice', clinic_name: 'Buea Regional Hospital', city: 'Buea', region: 'South-West', address: 'Molyko, Buea', phone: '+237670000001', latitude: 4.1560, longitude: 9.2620, rating: 4.6 },
  { full_name: 'Dr. Agnes Mbua', specialty: 'Pediatrics', clinic_name: 'Mount Mary Clinic', city: 'Buea', region: 'South-West', address: 'Great Soppo, Buea', phone: '+237670000002', latitude: 4.1540, longitude: 9.2810, rating: 4.8 },
  { full_name: 'Dr. Simon Ashu', specialty: 'Internal Medicine', clinic_name: 'CBC Health Services Buea', city: 'Buea', region: 'South-West', address: 'Bonduma, Buea', phone: '+237670000003', latitude: 4.1480, longitude: 9.2450, rating: 4.5 },
  { full_name: 'Dr. Linda Fon', specialty: 'Obstetrics & Gynecology', clinic_name: 'Buea Regional Hospital', city: 'Buea', region: 'South-West', address: 'Molyko, Buea', phone: '+237670000004', latitude: 4.1560, longitude: 9.2620, rating: 4.7 },
  { full_name: 'Dr. Peter Ekema', specialty: 'Dermatology', clinic_name: 'Skin Care Clinic Buea', city: 'Buea', region: 'South-West', address: 'Mile 17, Buea', phone: '+237670000005', latitude: 4.1350, longitude: 9.2300, rating: 4.4 },
  { full_name: 'Dr. Grace Tabe', specialty: 'General Practice', clinic_name: 'Bamenda Regional Hospital', city: 'Bamenda', region: 'North-West', address: 'Old Town, Bamenda', phone: '+237670000006', latitude: 5.9600, longitude: 10.1500, rating: 4.6 },
  { full_name: 'Dr. Martin Achidi', specialty: 'Cardiology', clinic_name: 'Bamenda Regional Hospital', city: 'Bamenda', region: 'North-West', address: 'Old Town, Bamenda', phone: '+237670000007', latitude: 5.9600, longitude: 10.1500, rating: 4.9 },
  { full_name: 'Dr. Comfort Ndi', specialty: 'Pediatrics', clinic_name: 'Mezam Polyclinic', city: 'Bamenda', region: 'North-West', address: 'Commercial Ave, Bamenda', phone: '+237670000008', latitude: 5.9630, longitude: 10.1520, rating: 4.5 },
  { full_name: 'Dr. Divine Kum', specialty: 'Internal Medicine', clinic_name: 'Azire Health Centre', city: 'Bamenda', region: 'North-West', address: 'Azire, Bamenda', phone: '+237670000009', latitude: 5.9450, longitude: 10.1400, rating: 4.3 },
  { full_name: 'Dr. Rachel Enow', specialty: 'Psychiatry', clinic_name: 'CBC Health Services Bamenda', city: 'Bamenda', region: 'North-West', address: 'Nkwen, Bamenda', phone: '+237670000010', latitude: 5.9750, longitude: 10.1700, rating: 4.7 },
  { full_name: 'Dr. Joseph Etonde', specialty: 'Emergency Medicine', clinic_name: 'Buea Regional Hospital', city: 'Buea', region: 'South-West', address: 'Molyko, Buea', phone: '+237670000011', latitude: 4.1560, longitude: 9.2620, rating: 4.6 },
  { full_name: 'Dr. Faith Chia', specialty: 'Emergency Medicine', clinic_name: 'Bamenda Regional Hospital', city: 'Bamenda', region: 'North-West', address: 'Old Town, Bamenda', phone: '+237670000012', latitude: 5.9600, longitude: 10.1500, rating: 4.5 },
];

const insert = db.prepare(`
  INSERT INTO doctors (id, full_name, specialty, clinic_name, city, region, address, phone, latitude, longitude, rating)
  VALUES (@id, @full_name, @specialty, @clinic_name, @city, @region, @address, @phone, @latitude, @longitude, @rating)
`);

const existing = db.prepare('SELECT COUNT(*) as c FROM doctors').get();
if (existing.c === 0) {
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run({ id: randomUUID(), ...row });
  });
  insertMany(doctors);
  console.log(`Seeded ${doctors.length} doctors.`);
} else {
  console.log('Doctors table already seeded, skipping.');
}
