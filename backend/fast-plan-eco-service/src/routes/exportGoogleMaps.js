/**
 * @swagger
 * /api/export-googlemaps:
 *   post:
 *     summary: GoogleMaps URL
 *     tags:
 *       - Export
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [waypoints]
 *             properties:
 *               waypoints:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Point'
 *                 minItems: 2
 *                 description: Array of waypoints for the route
 *     responses:
 *       200:
 *         description: GoogleMaps URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: GoogleMaps URL
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal error
 */
const express = require("express");
const { getDistanceMatrix } = require("../utils/osrmClient");
const { solveTSP } = require("../utils/tsp");

const travelMode = {
  car: "driving",
  electricCar: "driving",
  utility: "driving",
  electricUtility: "driving",
  bike: "bicycling",
  byFoot: "walking",
};

const router = express.Router();
router.post("/", async (req, res) => {
  const { waypoints } = req.body;
  if (!waypoints || waypoints.length < 2)
    return res.status(400).json({ error: "Bad request" });

  try {
    // Use waypoints directly for Google Maps export (no optimization needed)
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const middleWaypoints = waypoints
      .slice(1, -1)
      .map((p) => `${p.lat},${p.lng}`)
      .join("|");

    const url =
      `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      (middleWaypoints
        ? `&waypoints=${encodeURIComponent(middleWaypoints)}`
        : "") +
      `&travelmode=driving`; // Default to driving mode

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
