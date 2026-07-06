const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAnyPermission } = require('../middleware/permission.middleware');
const docsRoutes = require('../docs/docs.routes');
const authRoutes = require('../modules/auth/auth.routes');
const accountingRoutes = require('../modules/accounting/accounting.routes');
const auditLogRoutes = require('../modules/auditLogs/auditLogs.routes');
const commissionRoutes = require('../modules/commissions/commissions.routes');
const customerRoutes = require('../modules/customers/customers.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const dispatchRoutes = require('../modules/dispatch/dispatch.routes');
const healthRoutes = require('../modules/health/health.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const locationRoutes = require('../modules/locations/locations.routes');
const notificationRoutes = require('../modules/notifications/notifications.routes');
const packagingRoutes = require('../modules/packaging/packaging.routes');
const permissionRoutes = require('../modules/permissions/permissions.routes');
const paymentRoutes = require('../modules/payments/payments.routes');
const productionRoutes = require('../modules/production/production.routes');
const purchaseRoutes = require('../modules/purchases/purchases.routes');
const roleRoutes = require('../modules/roles/roles.routes');
const reportRoutes = require('../modules/reports/reports.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const superadminRoutes = require('../modules/superadmin/superadmin.routes');
const userRoutes = require('../modules/users/users.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Charcoal ERP API',
    data: {
      version: '0.1.0'
    }
  });
});

router.use('/health', healthRoutes);
router.use('/', docsRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/', superadminRoutes);
router.use('/', settingsRoutes);
router.use('/', inventoryRoutes);
router.use('/', packagingRoutes);
router.use('/', purchaseRoutes);
router.use('/', locationRoutes);
router.use('/', customerRoutes);
router.use('/', dashboardRoutes);
router.use('/', productionRoutes);
router.use('/', accountingRoutes);
router.use('/', paymentRoutes);
router.use('/', dispatchRoutes);
router.use('/', commissionRoutes);
router.use('/', reportRoutes);
router.use('/', auditLogRoutes);
router.use('/', notificationRoutes);

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif']
]);

router.post(
  '/upload',
  authenticate,
  requireAnyPermission('settings.manage', 'superadmin.manage'),
  (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ success: false, message: 'Filename and content are required' });
    }

    // Extract base64 data
    const matches = content.match(/^data:([A-Za-z0-9.+/-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid base64 image data' });
    }
    const mimeType = matches[1].toLowerCase();
    const extension = ALLOWED_UPLOAD_MIME_TYPES.get(mimeType);
    if (!extension) {
      return res.status(400).json({ success: false, message: 'Unsupported image type' });
    }

    const fileBuffer = Buffer.from(matches[2], 'base64');
    if (fileBuffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ success: false, message: 'Image is too large' });
    }
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename to avoid overwrites
    const safeBaseName = path.basename(filename, path.extname(filename))
      .replace(/[^a-zA-Z0-9\-_]/g, '')
      .slice(0, 80) || 'upload';
    const uniqueFilename = `${Date.now()}-${safeBaseName}.${extension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    fs.writeFileSync(filePath, fileBuffer);

    // Build fully qualified URL
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const url = `${protocol}://${host}/uploads/${uniqueFilename}`;

    res.json({
      success: true,
      url
    });
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

module.exports = router;
