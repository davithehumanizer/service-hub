require("dotenv").config();
const express = require("express");
const { swaggerUi, swaggerSpec } = require("./swagger");
const cors = require("cors");

const geocodeRouter = require("./routes/geocode");
const calculateRouter = require("./routes/calculateRoute");
const gpxRouter = require("./routes/exportGpx");
const mapsRouter = require("./routes/exportGoogleMaps");
const healthRoutes = require("./routes/healthRoutes");

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json()); // Apply JSON parsing globally

app.use("/api", express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/geocode-address", geocodeRouter);
app.use("/api/calculate-route", calculateRouter);
app.use("/api/export-gpx", gpxRouter);
app.use("/api/export-googlemaps", mapsRouter);
app.use("/api/health", healthRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI disponible sur http://localhost:${PORT}/api-docs`);
});
