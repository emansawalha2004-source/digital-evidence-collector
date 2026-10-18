function sendResponse(res, statusCode = 200, data = null, meta = null) {
  const payload = {
    success: true,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

module.exports = sendResponse;