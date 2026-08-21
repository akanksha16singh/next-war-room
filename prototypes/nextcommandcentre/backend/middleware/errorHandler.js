function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error("[error]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };
