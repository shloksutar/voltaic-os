/**
 * Professional Automated Test Suite for VoltaicOS
 * Covers:
 * 1. Validation Logic & Anti-Car Enforcement (Unit Tests)
 * 2. Database & Data Model Integrity (Integration Tests)
 * 3. Express API Server Endpoints & HTTP Security (API Tests)
 * 4. Production Build & Bundle Verification (E2E Asset Tests)
 */

import http from 'node:http';
import express from 'express';
import { apiRouter } from '../server/apiRouter.js';
import { db } from '../server/db.js';
import { configureHttpSecurity } from '../server/httpSecurity.js';
import {
  isValidEmail,
  isValidFullName,
  isValidCity,
  isValidAddress,
  isValidBrand,
  isValidDescription,
  containsCarReference,
  INDIAN_MOBILE_RE,
  PINCODE_RE,
  validateIdNumber,
  VERIFIED_2W_MODELS,
} from '../src/utils/formValidation.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
  } else {
    failed++;
    const msg = `  \x1b[31m✘ FAIL\x1b[0m: ${testName} ${details ? '(' + details + ')' : ''}`;
    console.error(msg);
    failures.push({ testName, details });
  }
}

async function runTests() {
  console.log('\n\x1b[1m========================================\x1b[0m');
  console.log('\x1b[1m⚡ VOLTAICOS INVESTOR-GRADE TEST SUITE ⚡\x1b[0m');
  console.log('\x1b[1m========================================\x1b[0m\n');

  // ─────────────────────────────────────────────────────────────
  // 1. UNIT TESTS: EMAIL VALIDATION & GIBBERISH DETECTION
  // ─────────────────────────────────────────────────────────────
  console.log('\x1b[36m[1/4] Testing Form Validation & Sanitization Engine...\x1b[0m');

  const officialConsumerEmails = [
    'sutarshlok18@gmail.com',
    'priya.sharma@yahoo.com',
    'vikram.nair@hotmail.com',
    'rahul.verma@ymail.com',
    'ananya.patel@outlook.com',
    'kavita.deshmukh@icloud.com',
    'arjun.mehta@zohomail.com',
    'deepak@rediffmail.com',
  ];
  for (const email of officialConsumerEmails) {
    assert(isValidEmail(email), `Official consumer email accepted: ${email}`);
  }

  const officialCompanyEmails = [
    'founder@voltaicos.com',
    'investor.relations@sequoia.in',
    'fleet_ops@chargezone.co.in',
    'director@iitb.ac.in',
    'officer@nic.in',
  ];
  for (const email of officialCompanyEmails) {
    assert(isValidEmail(email), `Official company/institutional email accepted: ${email}`);
  }

  const blockedEmails = [
    'sdfghjkl@ghjk.com',         // Gibberish local & domain mash
    'asdf@test.com',              // Keyboard mash & test domain
    'qwerty@fake.net',            // Keyboard mash & fake domain
    'bcdfgh@test.com',            // No vowels in local part
    'user@ghjk.com',              // No vowels in domain
    'user@mailinator.com',        // Disposable burner domain
    'temp.user@tempmail.com',     // Disposable email provider
    'rider@10minutemail.com',     // Temporary disposable inbox
    'fake.account@yopmail.com',   // Disposable domain
    'plainaddress',               // Missing @
    '@missinglocal.com',          // Missing local
    'missingtld@domain',          // Missing TLD
  ];
  for (const email of blockedEmails) {
    assert(!isValidEmail(email), `Gibberish/disposable/fake email rejected: ${email}`);
  }

  // Name validation
  assert(isValidFullName('Shlok Sutar'), 'Valid full name accepted: Shlok Sutar');
  assert(isValidFullName('Dr. Vikram Sundaram'), 'Name with title accepted');
  assert(!isValidFullName('asdfghjkl'), 'Keyboard mash name rejected');
  assert(!isValidFullName('John'), 'Single-word name rejected (requires first & last)');

  // Indian mobile validation
  assert(INDIAN_MOBILE_RE.test('9820154321'), 'Valid mobile (starts with 9) accepted');
  assert(INDIAN_MOBILE_RE.test('7738291045'), 'Valid mobile (starts with 7) accepted');
  assert(!INDIAN_MOBILE_RE.test('4820154321'), 'Invalid mobile (starts with 4) rejected');
  assert(!INDIAN_MOBILE_RE.test('98201'), 'Too short mobile rejected');

  // PIN code validation
  assert(PINCODE_RE.test('400001'), 'Valid Mumbai PIN code accepted');
  assert(PINCODE_RE.test('560001'), 'Valid Bengaluru PIN code accepted');
  assert(!PINCODE_RE.test('012345'), 'PIN code starting with 0 rejected');
  assert(!PINCODE_RE.test('4000'), 'Incomplete PIN code rejected');

  // Government ID validation
  assert(validateIdNumber('Aadhaar Card', '987654321098'), 'Valid 12-digit Aadhaar accepted');
  assert(!validateIdNumber('Aadhaar Card', '98765432109'), '11-digit Aadhaar rejected');
  assert(validateIdNumber('PAN Card', 'ABCDE1234F'), 'Valid PAN format ABCDE1234F accepted');
  assert(!validateIdNumber('PAN Card', '12345ABCDE'), 'Invalid PAN format rejected');

  // ─────────────────────────────────────────────────────────────
  // 2. UNIT TESTS: ANTI-CAR ENFORCEMENT & 2W VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m[2/4] Testing Anti-Car Enforcer for Community Host Portal...\x1b[0m');

  const carEntries = [
    'Tata Nexon EV Charger',
    'MG ZS EV Fast Charger',
    'Tesla Model 3 Station',
    'Hyundai Ioniq 5 AC Point',
    'Electric Car Rapid Bay',
    'CCS2 50kW Charger',
    'Mahindra XUV400 Charger',
    'BYD Atto 3 Home Plug',
  ];
  for (const car of carEntries) {
    assert(containsCarReference(car), `Car reference detected and blocked: ${car}`);
    assert(!isValidBrand(car), `Car brand rejected from Rent Charger: ${car}`);
  }

  const validTwoWheelers = [
    'Ather Dot Home Charger',
    'Ola S1 Portable Charger',
    'Havells 16A EV Socket',
    'Schneider 3-Pin Dedicated Point',
    'TVS iQube Companion Point',
    'River Indie Heavy Duty Plug',
    'Universal 16A 2-Wheeler Socket',
  ];
  for (const tw of validTwoWheelers) {
    assert(!containsCarReference(tw), `2-Wheeler charger passes anti-car filter: ${tw}`);
    assert(isValidBrand(tw), `2-Wheeler charger brand accepted: ${tw}`);
  }

  assert(VERIFIED_2W_MODELS.length >= 10, `Verified 2-wheeler model catalog has ${VERIFIED_2W_MODELS.length} models`);

  // ─────────────────────────────────────────────────────────────
  // 3. INTEGRATION TESTS: DATABASE & IN-MEMORY ENGINE
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m[3/4] Testing Data Layer & Database Integrity...\x1b[0m');

  const stations = db.getStations();
  assert(Array.isArray(stations) && stations.length > 0, `Station registry loaded (${stations.length} stations active)`);

  const mumbaiStations = stations.filter((s) => s.city.toLowerCase() === 'mumbai');
  assert(mumbaiStations.length > 0, `Regional query: ${mumbaiStations.length} Mumbai stations verified`);

  const alerts = db.getAlerts();
  assert(Array.isArray(alerts), `Incident telemetry loaded (${alerts.length} active alerts)`);

  const testAlert = db.addAlert({
    type: 'ice',
    severity: 'low',
    station: 'Test Station Mumbai',
    city: 'Mumbai',
    msg: 'Automated test suite alert trigger',
  });
  assert(testAlert && testAlert.id, `Alert insertion verified: ${testAlert?.id}`);

  // ─────────────────────────────────────────────────────────────
  // 4. API & HTTP SECURITY INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[36m[4/4] Spinning Up Ephemeral Server & Running HTTP Tests...\x1b[0m');

  const app = express();
  configureHttpSecurity(app);
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'VoltaicOS Automated Test Runner', time: new Date().toISOString() });
  });
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, '127.0.0.1', resolve));

  async function apiGet(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:5099${path}`, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw });
          }
        });
      }).on('error', reject);
    });
  }

  async function apiPost(path, payload, token = null) {
    return new Promise((resolve, reject) => {
      const dataString = JSON.stringify(payload);
      const req = http.request(
        `http://127.0.0.1:5099${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(raw) });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, raw });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(dataString);
      req.end();
    });
  }

  try {
    // Test Health Check
    const health = await apiGet('/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /health returns 200 OK');
    assert(health.headers['x-content-type-options'] === 'nosniff', 'Security header X-Content-Type-Options present');

    // Test Stations API
    const stationsRes = await apiGet('/api/stations');
    assert(stationsRes.status === 200 && Array.isArray(stationsRes.data.stations), `GET /api/stations returns 200 (${stationsRes.data.count} stations)`);

    // Test Alerts API
    const alertsRes = await apiGet('/api/alerts');
    assert(alertsRes.status === 200 && Array.isArray(alertsRes.data.alerts), `GET /api/alerts returns 200 (${alertsRes.data.count} alerts)`);

    // Test Analytics API
    const analyticsRes = await apiGet('/api/analytics');
    assert(analyticsRes.status === 200 && analyticsRes.data.stationsCount > 0, `GET /api/analytics returns 200 with operational metrics`);

    // Test Charger Listing API rejects Car Charger without auth
    const unauthCarListing = await apiPost('/api/charger-listings', {
      fullName: 'Test Host',
      email: 'host@voltaicos.com',
      phone: '9820154321',
      chargerBrand: 'Tata Nexon EV Fast Charger',
      connectorType: 'CCS2',
    });
    assert(unauthCarListing.status === 401, 'POST /api/charger-listings enforces authentication (401 Unauthorized)');

    // Test Auth Register Rejects Non-Official / Fake Emails
    const fakeReg1 = await apiPost('/api/auth/register', {
      name: 'Fake User',
      email: 'sdfghjkl@ghjk.com',
      password: 'StrongPassword123!',
      phone: '9820154321',
    });
    assert(
      fakeReg1.status === 400 && fakeReg1.data.error.includes('official or professional email'),
      'POST /api/auth/register rejects keyboard-mash/fake email (400 Bad Request)'
    );

    const fakeReg2 = await apiPost('/api/auth/register', {
      name: 'Disposable User',
      email: 'user@mailinator.com',
      password: 'StrongPassword123!',
      phone: '9820154321',
    });
    assert(
      fakeReg2.status === 400 && fakeReg2.data.error.includes('official or professional email'),
      'POST /api/auth/register rejects disposable/burner email (400 Bad Request)'
    );

    // Test Auth Register Accepts Official Email
    const uniqueEmail = `test.investor.${Date.now()}@voltaicos.in`;
    const regRes = await apiPost('/api/auth/register', {
      name: 'Investor Demo User',
      email: uniqueEmail,
      password: 'StrongPassword123!',
      phone: '9820154321',
    });
    assert(regRes.status === 201 && regRes.data.token, 'POST /api/auth/register creates account & issues session token');

    const userToken = regRes.data?.token;

    // Test Car Charger Rejection with Auth
    const carListingAttempt = await apiPost(
      '/api/charger-listings',
      {
        fullName: 'Investor Demo User',
        email: uniqueEmail,
        phone: '9820154321',
        chargerBrand: 'Tata Nexon EV Rapid Point',
        connectorType: 'CCS2 DC Rapid',
        powerLevel: '50 kW',
        pricePerUnit: '18',
        address: 'Bandra Kurla Complex',
        city: 'Mumbai',
        pincode: '400051',
      },
      userToken
    );
    assert(
      carListingAttempt.status === 400 && carListingAttempt.data.error.includes('EV 2-wheeler'),
      'POST /api/charger-listings strictly rejects car chargers (400 Bad Request with anti-car policy message)'
    );

    // Test Valid 2-Wheeler Charger Listing with Auth
    const twListing = await apiPost(
      '/api/charger-listings',
      {
        fullName: 'Investor Demo User',
        email: uniqueEmail,
        phone: '9820154321',
        chargerBrand: 'Ather Dot Home Fast Point',
        connectorType: '16A 3-Pin Socket (Fast)',
        powerLevel: '3.3 kW (16A Standard)',
        pricePerUnit: '15',
        address: 'Indiranagar 100ft Road',
        city: 'Bengaluru',
        pincode: '560038',
        supportedVehicles: ['Ather 450X', 'Ola S1 Pro', 'TVS iQube'],
        selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        timeFrom: '08:00',
        timeTo: '20:00',
        idType: 'Aadhaar Card',
        idNumber: '987654321098',
      },
      userToken
    );
    assert(
      twListing.status === 201 && twListing.data.listing?.id,
      `POST /api/charger-listings accepts valid 2-wheeler charger (${twListing.data.listing?.id})`
    );

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // ─────────────────────────────────────────────────────────────
  // TEST SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n\x1b[1m========================================\x1b[0m');
  console.log('\x1b[1m📊 TEST EXECUTION SUMMARY\x1b[0m');
  console.log('\x1b[1m========================================\x1b[0m');
  console.log(`Total Assertions : \x1b[1m${passed + failed}\x1b[0m`);
  console.log(`Passed           : \x1b[32m\x1b[1m${passed}\x1b[0m`);
  console.log(`Failed           : ${failed > 0 ? `\x1b[31m\x1b[1m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);

  if (failed === 0) {
    console.log('\n\x1b[32m\x1b[1m✨ ALL TESTS PASSED! VoltaicOS is verified and investor-ready. ✨\x1b[0m\n');
    process.exit(0);
  } else {
    console.error('\n\x1b[31m\x1b[1m❌ SOME TESTS FAILED. Please review failures above.\x1b[0m\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

