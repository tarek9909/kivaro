const settingsService = require('./settings.service');
const { successResponse } = require('../../utils/response');

async function getCompanyProfile(req, res) {
  const companyProfile = await settingsService.getCompanyProfile(req.user);

  return successResponse(res, {
    message: 'Company profile fetched',
    data: {
      company_profile: companyProfile
    }
  });
}

async function updateCompanyProfile(req, res) {
  const companyProfile = await settingsService.updateCompanyProfile(req.body, req.user);

  return successResponse(res, {
    message: 'Company profile updated',
    data: {
      company_profile: companyProfile
    }
  });
}

async function listSettings(req, res) {
  const settings = await settingsService.listSettings(req.user);

  return successResponse(res, {
    message: 'Settings fetched',
    data: {
      settings
    }
  });
}

async function getVatSettings(req, res) {
  const vat = await settingsService.getVatSettings({ ...req.user, query: req.query });

  return successResponse(res, {
    message: 'VAT settings fetched',
    data: { vat }
  });
}

async function updateVatSettings(req, res) {
  const vat = await settingsService.updateVatSettings(req.body, req.user.id, req.user);

  return successResponse(res, {
    message: 'VAT settings updated',
    data: { vat }
  });
}

async function updateSetting(req, res) {
  const setting = await settingsService.updateSetting(
    req.params.key,
    req.body,
    req.user.id,
    req.user
  );

  return successResponse(res, {
    message: 'Setting updated',
    data: {
      setting
    }
  });
}

module.exports = {
  getCompanyProfile,
  getVatSettings,
  listSettings,
  updateCompanyProfile,
  updateVatSettings,
  updateSetting
};
