/**
 * @swagger
 * /api/calculate-route:
 *   post:
 *     summary: Calculate optimized route
 *     tags:
 *       - Route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baseAddress, followingAddresses, vehicle]
 *             properties:
 *               baseAddress:
 *                 $ref: '#/components/schemas/Point'
 *               followingAddresses:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Point'
 *               vehicle:
 *                 type: string
 *                 enum: [car, electricCar, utility, electricUtility, bike, byFoot]
 *     responses:
 *       200:
 *         description: Route optimization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 optimizedPoints:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Point'
 *                 geometry:
 *                   type: object
 *                   description: Route GeoJSON
 *                 totalDistance:
 *                   type: string
 *                   description: Distance (km)
 *                 totalTime:
 *                   type: integer
 *                   description: Time (min)
 *                 carbonFootprint:
 *                   type: number
 *                   description: Carbon Footprint (kg CO2)
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal error
 */
const express = require("express");
const { getDistanceMatrix, getRouteGeoJSON } = require("../utils/osrmClient");
const { solveTSP } = require("../utils/tsp");

const emission = {
  car: 251,
  electricCar: 100,
  utility: 251,
  electricUtility: 100,
  bike: 15,
  byFoot: 0,
}; // sources : greenly.earth ; sami.eco ;

const router = express.Router();
router.post("/", async (req, res) => {
  const { baseAddress, followingAddresses, vehicle } = req.body;
  if (!baseAddress || !followingAddresses.length || !vehicle)
    return res.status(400).json({ error: "Bad request" });

  try {
    const points = [baseAddress, ...followingAddresses];
    const matrix = await getDistanceMatrix(points);
    const { order } = solveTSP(matrix);
    const optimized = [baseAddress, ...order.map((i) => points[i])];

    const route = await getRouteGeoJSON(optimized);
    const distKmStr = (route.distance / 1000).toFixed(2);
    const distKm = parseFloat(distKmStr);
    const durationSec = route.duration;

    res.json({
      optimizedPoints: optimized,
      geometry: route.geometry,
      totalDistance: distKm,
      totalTime: Math.floor(durationSec / 60),
      carbonFootprint: distKm * emission[vehicle],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
