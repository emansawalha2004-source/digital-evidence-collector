const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getUploadsDir, ensureDirectoryExists, getRelativeStoragePath } = require('../utils/fileUtils');

const User = require('../models/User');
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const AuditLog = require('../models/AuditLog');
const AnalysisResult = require('../models/AnalysisResult');


dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/evidence_system';

async function upsertUser({ fullName, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return User.findOneAndUpdate(
    { email },
    { fullName, email, passwordHash, role, isActive: true, mfaEnabled: false },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function createStoredFile(name, content, mimeType = 'text/plain') {
  const uploadsDir = getUploadsDir();
  ensureDirectoryExists(uploadsDir);
  const storedName = `seed-${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${name}`;
  const filePath = path.join(uploadsDir, storedName);
  fs.writeFileSync(filePath, content);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return {
    originalName: name,
    storedName,
    relativePath: getRelativeStoragePath(filePath),
    mimeType,
    size: fs.statSync(filePath).size,
    sha256,
  };
}

function daysAgo(days, hours = 0) {
  return new Date(Date.now() - ((days * 24 + hours) * 60 * 60 * 1000));
}

async function addLog({ action, actorId, caseId = null, evidenceId = null, message, metadata = {}, createdAt = new Date() }) {
  return AuditLog.create({ action, actorId, caseId, evidenceId, message, metadata, createdAt });
}

async function addAnalysis({ evidence, requestedBy, riskScore, riskLevel, indicators, summary, recommendation, createdAt = new Date() }) {
  return AnalysisResult.create({
    evidenceId: evidence._id,
    caseId: evidence.caseId,
    requestedBy,
    analysisType: evidence.evidenceType === 'link' ? 'link' : evidence.evidenceType === 'text' ? 'text' : 'file',
    riskScore,
    riskLevel,
    indicators,
    summary,
    recommendation,
    rawInput: null,
    createdAt,
  });
}

async function run() {
  // حماية صارمة: منع تشغيل الـ Seed نهائياً في بيئة الإنتاج لمنع مسح بيانات النظام
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL ERROR: Cannot run seed script in production environment!');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  await Promise.all([
    AnalysisResult.deleteMany({}),
    AuditLog.deleteMany({}),
    Evidence.deleteMany({}),
    Case.deleteMany({}),
    User.deleteMany({}),
  ]);

  const admin = await upsertUser({ fullName: 'System Admin', email: 'admin@evidence.local', password: 'Admin@123456', role: 'admin' });
  const investigator = await upsertUser({ fullName: 'Cyber Investigator', email: 'investigator@evidence.local', password: 'Investigator@123456', role: 'investigator' });
  const investigator2 = await upsertUser({ fullName: 'Field Analyst', email: 'analyst@evidence.local', password: 'Analyst@123456', role: 'investigator' });
  const viewer = await upsertUser({ fullName: 'Read Only Viewer', email: 'viewer@evidence.local', password: 'Viewer@123456', role: 'viewer' });
  const auditor = await upsertUser({ fullName: 'Integrity Auditor', email: 'auditor@evidence.local', password: 'Auditor@123456', role: 'auditor' });

  const cases = await Case.insertMany([
    {
      title: 'Suspicious Banking Phishing Campaign',
      description: 'Multiple victims received messages asking them to verify bank credentials through a non-secure login page.',
      status: 'open',
      priority: 'critical',
      owner: investigator._id,
      assignedUsers: [admin._id, investigator._id, auditor._id],
      tags: ['phishing', 'bank', 'otp', 'critical'],
      createdAt: daysAgo(8),
      updatedAt: daysAgo(1),
    },
    {
      title: 'Compromised Business Email Thread',
      description: 'A finance employee reported an invoice redirection attempt from a spoofed supplier account.',
      status: 'in_review',
      priority: 'high',
      owner: investigator2._id,
      assignedUsers: [admin._id, investigator2._id],
      tags: ['bec', 'invoice', 'email'],
      createdAt: daysAgo(6),
      updatedAt: daysAgo(2),
    },
    {
      title: 'Malware Attachment Review',
      description: 'Endpoint team submitted suspicious attachment metadata for chain-of-custody documentation.',
      status: 'open',
      priority: 'high',
      owner: investigator._id,
      assignedUsers: [admin._id, investigator._id, auditor._id],
      tags: ['malware', 'attachment', 'hash'],
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1, 6),
    },
    {
      title: 'Social Media Impersonation Report',
      description: 'A user reported an account impersonating a public profile and sending malicious links.',
      status: 'open',
      priority: 'medium',
      owner: investigator2._id,
      assignedUsers: [admin._id, investigator2._id],
      tags: ['social', 'impersonation', 'links'],
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      title: 'Closed Test Evidence Integrity Case',
      description: 'Completed sample case used to verify report output, hash preservation, and admin dashboards.',
      status: 'closed',
      priority: 'low',
      owner: investigator._id,
      assignedUsers: [admin._id, viewer._id],
      tags: ['closed', 'integrity', 'sample'],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(7),
    },
    {
      title: 'Crypto Wallet Recovery Scam',
      description: 'Victim was contacted by a fake recovery agent requesting seed phrase fragments and an advance processing fee.',
      status: 'open',
      priority: 'critical',
      owner: investigator._id,
      assignedUsers: [admin._id, investigator._id, auditor._id],
      tags: ['crypto', 'wallet', 'recovery-scam', 'seed-phrase'],
      createdAt: daysAgo(5, 3),
      updatedAt: daysAgo(1, 4),
    },
    {
      title: 'Insider Data Exfiltration Alert',
      description: 'DLP system detected unusual outbound document transfers from a privileged workstation after office hours.',
      status: 'in_review',
      priority: 'high',
      owner: investigator2._id,
      assignedUsers: [admin._id, investigator2._id, auditor._id],
      tags: ['dlp', 'insider', 'usb', 'exfiltration'],
      createdAt: daysAgo(9, 5),
      updatedAt: daysAgo(2, 2),
    },
    {
      title: 'Online Blackmail Evidence Package',
      description: 'Complainant submitted screenshots and message transcripts showing extortion demands and payment pressure.',
      status: 'open',
      priority: 'high',
      owner: investigator._id,
      assignedUsers: [admin._id, investigator._id],
      tags: ['blackmail', 'extortion', 'chat', 'payment'],
      createdAt: daysAgo(2, 12),
      updatedAt: daysAgo(0, 10),
    },
    {
      title: 'Lost Mobile Device Account Takeover',
      description: 'User reported account recovery alerts after losing a mobile device with active messaging sessions.',
      status: 'open',
      priority: 'medium',
      owner: investigator2._id,
      assignedUsers: [admin._id, investigator2._id],
      tags: ['mobile', 'account-takeover', 'sim', 'location'],
      createdAt: daysAgo(1, 18),
      updatedAt: daysAgo(0, 8),
    },
    {
      title: 'Fake E-Commerce Store Complaint',
      description: 'Multiple buyers reported payments to a store that disappeared after order confirmation messages were sent.',
      status: 'in_review',
      priority: 'medium',
      owner: investigator._id,
      assignedUsers: [admin._id, investigator._id],
      tags: ['ecommerce', 'fraud', 'payment', 'store'],
      createdAt: daysAgo(10, 2),
      updatedAt: daysAgo(3, 1),
    },
  ]);

  const [phishingCase, becCase, malwareCase, socialCase, closedCase, cryptoCase, insiderCase, extortionCase, lostDeviceCase, fakeStoreCase] = cases;

  const phishingText = await Evidence.create({
    caseId: phishingCase._id,
    uploadedBy: investigator._id,
    title: 'Victim SMS Verification Message',
    description: 'SMS asks the victim to verify bank access and enter OTP urgently.',
    evidenceType: 'text',
    priority: 'critical',
    content: 'URGENT: verify account now. Your bank profile will be blocked. Enter password and OTP after clicking here.',
    tags: ['sms', 'otp', 'bank'],
    notes: [{ text: 'Victim confirmed the message arrived before a suspicious login attempt.', createdBy: investigator._id }],
    createdAt: daysAgo(8, 2),
  });

  const phishingLink = await Evidence.create({
    caseId: phishingCase._id,
    uploadedBy: investigator._id,
    title: 'Non-HTTPS Banking Login URL',
    description: 'URL collected from SMS body for preliminary phishing review.',
    evidenceType: 'link',
    priority: 'critical',
    content: 'http://secure-bank-verify-login.xyz/account/login/verify?session=otp',
    tags: ['url', 'phishing', 'login'],
    createdAt: daysAgo(8, 1),
  });

  const phishingFile = await Evidence.create({
    caseId: phishingCase._id,
    uploadedBy: investigator._id,
    title: 'Victim Screenshot Metadata',
    description: 'Text export of screenshot metadata and capture context.',
    evidenceType: 'file',
    priority: 'high',
    file: createStoredFile('victim-screenshot-metadata.txt', 'Captured SMS screenshot metadata. Device timezone +0300. Source: victim phone export.'),
    tags: ['screenshot', 'metadata'],
    createdAt: daysAgo(7, 20),
  });

  const becEmail = await Evidence.create({
    caseId: becCase._id,
    uploadedBy: investigator2._id,
    title: 'Spoofed Supplier Email Text',
    description: 'Email asks finance team to redirect payment to a new wallet and account.',
    evidenceType: 'text',
    priority: 'high',
    content: 'Please process the overdue invoice today. This is urgent. Use the new wire transfer account and confirm credentials.',
    tags: ['email', 'invoice', 'wire-transfer'],
    createdAt: daysAgo(6, 4),
  });

  const becHeader = await Evidence.create({
    caseId: becCase._id,
    uploadedBy: investigator2._id,
    title: 'Email Header Export',
    description: 'Header export showing suspicious reply-to mismatch.',
    evidenceType: 'file',
    priority: 'medium',
    file: createStoredFile('email-header-export.txt', 'Return-Path: spoofed-supplier@example.top\nReply-To: payments-verify@example.xyz\nSPF: softfail'),
    tags: ['headers', 'email'],
    createdAt: daysAgo(6, 2),
  });

  const malwareMeta = await Evidence.create({
    caseId: malwareCase._id,
    uploadedBy: investigator._id,
    title: 'Attachment Hash Record',
    description: 'Metadata for executable attachment submitted by endpoint team.',
    evidenceType: 'file',
    priority: 'high',
    file: createStoredFile('invoice-review.exe.txt', 'Original attachment name: invoice-review.exe\nQuarantined by endpoint agent.\nStatic review required.'),
    tags: ['malware', 'hash', 'endpoint'],
    createdAt: daysAgo(4, 5),
  });

  const malwareNote = await Evidence.create({
    caseId: malwareCase._id,
    uploadedBy: investigator._id,
    title: 'Endpoint Alert Text',
    description: 'Endpoint alert body copied by SOC analyst.',
    evidenceType: 'text',
    priority: 'high',
    content: 'Malware alert: suspicious script attempted credential access and remote access persistence.',
    tags: ['endpoint', 'malware'],
    createdAt: daysAgo(4, 4),
  });

  const socialLink = await Evidence.create({
    caseId: socialCase._id,
    uploadedBy: investigator2._id,
    title: 'Impersonation Profile Link',
    description: 'Profile link shared by complainant for review.',
    evidenceType: 'link',
    priority: 'medium',
    content: 'https://social.example.com/profile/support-bonus-verify',
    tags: ['social', 'profile'],
    createdAt: daysAgo(3, 6),
  });

  const socialMessage = await Evidence.create({
    caseId: socialCase._id,
    uploadedBy: investigator2._id,
    title: 'Direct Message Transcript',
    description: 'Transcript asks user to click a bonus verification link.',
    evidenceType: 'text',
    priority: 'medium',
    content: 'Click here to verify your free bonus. Update your account now to avoid losing access.',
    tags: ['dm', 'social', 'verify'],
    createdAt: daysAgo(3, 5),
  });

  const closedFile = await Evidence.create({
    caseId: closedCase._id,
    uploadedBy: investigator._id,
    title: 'Closed Case Integrity File',
    description: 'Stable sample file used for completed integrity verification.',
    evidenceType: 'file',
    priority: 'low',
    status: 'archived',
    file: createStoredFile('closed-case-integrity.txt', 'Closed case sample. Hash retained for report tests.'),
    tags: ['closed', 'sample'],
    createdAt: daysAgo(12),
  });


  const cryptoChat = await Evidence.create({
    caseId: cryptoCase._id,
    uploadedBy: investigator._id,
    title: 'Wallet Recovery Agent Chat Transcript',
    description: 'Transcript shows request for seed phrase fragments and upfront recovery fees.',
    evidenceType: 'text',
    priority: 'critical',
    content: 'We can recover your wallet today. Send twelve recovery words and pay the unlock fee within one hour.',
    tags: ['crypto', 'seed-phrase', 'chat'],
    createdAt: daysAgo(5, 2),
  });

  const cryptoUrl = await Evidence.create({
    caseId: cryptoCase._id,
    uploadedBy: investigator._id,
    title: 'Fake Wallet Recovery Portal',
    description: 'Portal link sent to victim for wallet recovery verification.',
    evidenceType: 'link',
    priority: 'critical',
    content: 'https://wallet-recovery-secure.example.net/restore/seed-check',
    tags: ['crypto', 'portal', 'phishing'],
    createdAt: daysAgo(5, 1),
  });

  const cryptoMemo = await Evidence.create({
    caseId: cryptoCase._id,
    uploadedBy: investigator._id,
    title: 'Crypto Transfer Memo Export',
    description: 'Text export showing claimed recovery fee address and transaction notes.',
    evidenceType: 'file',
    priority: 'high',
    file: createStoredFile('crypto-transfer-memo.txt', 'Recovery fee address: 0xFakedRecovery000000000000\nVictim note: paid after agent pressure.'),
    tags: ['crypto', 'transaction', 'memo'],
    createdAt: daysAgo(4, 23),
  });

  const insiderDlp = await Evidence.create({
    caseId: insiderCase._id,
    uploadedBy: investigator2._id,
    title: 'DLP Alert Export',
    description: 'System export for late-night transfer of restricted documents.',
    evidenceType: 'file',
    priority: 'high',
    file: createStoredFile('dlp-alert-export.csv', 'timestamp,user,action,file_count\n22:41,privileged.user,usb_copy,184\n22:46,privileged.user,cloud_upload,37', 'text/csv'),
    tags: ['dlp', 'usb', 'cloud-upload'],
    createdAt: daysAgo(9, 3),
  });

  const insiderNote = await Evidence.create({
    caseId: insiderCase._id,
    uploadedBy: investigator2._id,
    title: 'Manager Escalation Note',
    description: 'Manager reported unusual access timing and removable media use.',
    evidenceType: 'text',
    priority: 'high',
    content: 'Employee accessed restricted client folders outside shift hours and copied multiple files to removable media.',
    tags: ['insider', 'manager-note'],
    createdAt: daysAgo(9, 2),
  });

  const extortionText = await Evidence.create({
    caseId: extortionCase._id,
    uploadedBy: investigator._id,
    title: 'Extortion Message Transcript',
    description: 'Threat message demanding payment and warning victim not to contact police.',
    evidenceType: 'text',
    priority: 'high',
    content: 'Pay within 24 hours or the files will be published. Do not contact anyone. Send proof of payment now.',
    tags: ['blackmail', 'threat', 'payment'],
    createdAt: daysAgo(2, 11),
  });

  const extortionPayment = await Evidence.create({
    caseId: extortionCase._id,
    uploadedBy: investigator._id,
    title: 'Payment Demand Link',
    description: 'Payment link included in extortion chat.',
    evidenceType: 'link',
    priority: 'high',
    content: 'https://pay.example.org/private-settlement/urgent-ticket',
    tags: ['payment', 'extortion', 'link'],
    createdAt: daysAgo(2, 10),
  });

  const lostLocation = await Evidence.create({
    caseId: lostDeviceCase._id,
    uploadedBy: investigator2._id,
    title: 'Last Device Location Export',
    description: 'Location history export before account recovery alerts started.',
    evidenceType: 'file',
    priority: 'medium',
    file: createStoredFile('last-device-location.json', JSON.stringify({ device: 'mobile', lastSeen: '2026-05-13T19:12:00+03:00', city: 'Zarqa', status: 'lost' }, null, 2), 'application/json'),
    tags: ['mobile', 'location', 'json'],
    createdAt: daysAgo(1, 16),
  });

  const lostAccountAlert = await Evidence.create({
    caseId: lostDeviceCase._id,
    uploadedBy: investigator2._id,
    title: 'Account Recovery Alert Text',
    description: 'Alert text copied from email after device loss.',
    evidenceType: 'text',
    priority: 'medium',
    content: 'A new recovery request was initiated from an unknown device. Reset your password if this was not you.',
    tags: ['account-recovery', 'mobile'],
    createdAt: daysAgo(1, 15),
  });

  const fakeStoreUrl = await Evidence.create({
    caseId: fakeStoreCase._id,
    uploadedBy: investigator._id,
    title: 'Fake Store Checkout URL',
    description: 'Checkout page collected from buyer report.',
    evidenceType: 'link',
    priority: 'medium',
    content: 'http://discount-market-confirm.example.store/checkout/payment-confirmation',
    tags: ['ecommerce', 'checkout', 'fraud'],
    createdAt: daysAgo(10, 1),
  });

  const fakeStoreReceipt = await Evidence.create({
    caseId: fakeStoreCase._id,
    uploadedBy: investigator._id,
    title: 'Order Confirmation Metadata',
    description: 'Exported metadata from buyer confirmation screenshot.',
    evidenceType: 'file',
    priority: 'medium',
    file: createStoredFile('order-confirmation-metadata.txt', 'Order ID: FS-88421\nPayment confirmed message received. Store domain went offline after purchase.'),
    tags: ['receipt', 'metadata', 'store'],
    createdAt: daysAgo(9, 22),
  });

  const fakeStoreChat = await Evidence.create({
    caseId: fakeStoreCase._id,
    uploadedBy: investigator._id,
    title: 'Customer Support Chat Export',
    description: 'Chat export where support agent pressures buyer to complete second payment.',
    evidenceType: 'text',
    priority: 'medium',
    content: 'Your order is on hold. Pay the customs clearance amount now through the alternate link to release shipment.',
    tags: ['support-chat', 'payment-pressure'],
    createdAt: daysAgo(9, 20),
  });

  const allEvidence = [
    phishingText, phishingLink, phishingFile, becEmail, becHeader,
    malwareMeta, malwareNote, socialLink, socialMessage, closedFile,
    cryptoChat, cryptoUrl, cryptoMemo, insiderDlp, insiderNote,
    extortionText, extortionPayment, lostLocation, lostAccountAlert,
    fakeStoreUrl, fakeStoreReceipt, fakeStoreChat,
  ];

  for (const item of allEvidence) {
    await addLog({ action: 'upload_evidence', actorId: item.uploadedBy, caseId: item.caseId, evidenceId: item._id, message: `Evidence uploaded: ${item.title}`, metadata: { seed: true, evidenceType: item.evidenceType }, createdAt: item.createdAt });
  }

  for (const item of cases) {
    await addLog({ action: 'create_case', actorId: item.owner, caseId: item._id, message: `Case created: ${item.title}`, metadata: { seed: true, priority: item.priority }, createdAt: item.createdAt });
  }

  await addLog({ action: 'verify_integrity', actorId: auditor._id, caseId: phishingCase._id, evidenceId: phishingFile._id, message: 'SHA-256 verification completed for victim screenshot metadata.', metadata: { matches: true, sha256: phishingFile.file.sha256 }, createdAt: daysAgo(7, 18) });
  await addLog({ action: 'add_note', actorId: investigator._id, caseId: phishingCase._id, evidenceId: phishingText._id, message: 'Investigator note added to SMS evidence.', metadata: { seed: true }, createdAt: daysAgo(7, 17) });
  await addLog({ action: 'verify_integrity', actorId: auditor._id, caseId: malwareCase._id, evidenceId: malwareMeta._id, message: 'Hash verification completed for malware metadata record.', metadata: { matches: true, sha256: malwareMeta.file.sha256 }, createdAt: daysAgo(3, 23) });
  await addLog({ action: 'generate_report', actorId: investigator._id, caseId: phishingCase._id, message: 'User generated case report for phishing investigation timeline validation.', metadata: { seed: true, reportType: 'case' }, createdAt: daysAgo(6) });

  await addAnalysis({ evidence: phishingText, requestedBy: admin._id, riskScore: 86, riskLevel: 'critical', indicators: [
    { key: 'suspicious_keyword', message: 'Suspicious keyword detected: verify account', severity: 'high' },
    { key: 'otp_request', message: 'Message requests OTP disclosure.', severity: 'critical' },
  ], summary: 'Strong phishing and OTP theft indicators detected.', recommendation: 'Escalate immediately to cybercrime investigator.', createdAt: daysAgo(7, 16) });

  await addAnalysis({ evidence: phishingLink, requestedBy: admin._id, riskScore: 92, riskLevel: 'critical', indicators: [
    { key: 'not_https', message: 'URL does not use HTTPS.', severity: 'medium' },
    { key: 'risky_tld', message: 'Risky TLD detected: .xyz', severity: 'high' },
    { key: 'phishing_terms', message: 'URL contains common phishing terms.', severity: 'high' },
  ], summary: 'Link appears highly suspicious and matches phishing patterns.', recommendation: 'Block URL and preserve full message context.', createdAt: daysAgo(7, 15) });

  await addAnalysis({ evidence: becEmail, requestedBy: investigator2._id, riskScore: 78, riskLevel: 'high', indicators: [
    { key: 'wire_transfer', message: 'Wire transfer instruction detected.', severity: 'high' },
    { key: 'urgent_language', message: 'Urgent financial pressure language detected.', severity: 'medium' },
  ], summary: 'Business email compromise indicators detected.', recommendation: 'Verify supplier identity using an independent channel.', createdAt: daysAgo(5, 22) });

  await addAnalysis({ evidence: becHeader, requestedBy: investigator2._id, riskScore: 64, riskLevel: 'medium', indicators: [
    { key: 'reply_to_mismatch', message: 'Reply-To mismatch should be manually reviewed.', severity: 'medium' },
  ], summary: 'Header evidence requires manual review.', recommendation: 'Compare header chain against legitimate supplier history.', createdAt: daysAgo(5, 20) });

  await addAnalysis({ evidence: malwareMeta, requestedBy: admin._id, riskScore: 74, riskLevel: 'high', indicators: [
    { key: 'risky_extension', message: 'Executable attachment name detected in metadata.', severity: 'high' },
  ], summary: 'File metadata contains malware-related indicators.', recommendation: 'Keep attachment quarantined and forward to malware analyst.', createdAt: daysAgo(3, 22) });

  await addAnalysis({ evidence: malwareNote, requestedBy: investigator._id, riskScore: 82, riskLevel: 'high', indicators: [
    { key: 'credential_access', message: 'Credential access language detected.', severity: 'high' },
    { key: 'remote_access', message: 'Remote access persistence language detected.', severity: 'high' },
  ], summary: 'Endpoint text indicates likely malicious behavior.', recommendation: 'Escalate to incident response team.', createdAt: daysAgo(3, 20) });

  await addAnalysis({ evidence: socialLink, requestedBy: investigator2._id, riskScore: 42, riskLevel: 'medium', indicators: [
    { key: 'phishing_terms', message: 'Profile URL contains verification terms.', severity: 'medium' },
  ], summary: 'Moderate social engineering indicators detected.', recommendation: 'Capture profile evidence and request platform review.', createdAt: daysAgo(2, 20) });

  await addAnalysis({ evidence: socialMessage, requestedBy: investigator2._id, riskScore: 58, riskLevel: 'medium', indicators: [
    { key: 'click_here', message: 'Message contains click-through lure.', severity: 'medium' },
    { key: 'account_update', message: 'Account update pressure detected.', severity: 'medium' },
  ], summary: 'Message shows social engineering characteristics.', recommendation: 'Preserve transcript and related account metadata.', createdAt: daysAgo(2, 18) });

  await addAnalysis({ evidence: closedFile, requestedBy: admin._id, riskScore: 8, riskLevel: 'low', indicators: [], summary: 'No major risk indicators detected in closed sample.', recommendation: 'Keep normal chain-of-custody controls.', createdAt: daysAgo(11) });

  console.log('Seed completed with expanded admin dashboard data');
  console.log('\nAdmin:\nemail: admin@evidence.local\npassword: Admin@123456');
  console.log('\nInvestigator:\nemail: investigator@evidence.local\npassword: Investigator@123456');
  console.log('\nAnalyst:\nemail: analyst@evidence.local\npassword: Analyst@123456');
  console.log('\nViewer:\nemail: viewer@evidence.local\npassword: Viewer@123456');
  console.log('\nAuditor:\nemail: auditor@evidence.local\npassword: Auditor@123456');
}

run()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
