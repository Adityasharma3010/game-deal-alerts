export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    success: true,
    service: "GamePulse API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
