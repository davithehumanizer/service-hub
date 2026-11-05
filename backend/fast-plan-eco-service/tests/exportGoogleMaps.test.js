const request = require('supertest');
const express = require('express');
const mapsRouter = require('../src/routes/exportGoogleMaps');

jest.mock('../src/utils/fetch');
const fetch = require('../src/utils/fetch');

describe('POST /api/export-googlemaps', () => {
    let app;
    const waypoint1 = { address: 'A', lat: 0, lng: 0 };
    const waypoint2 = { address: 'B', lat: 0, lng: 1 };

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/export-googlemaps', mapsRouter);
    });

    it('returns a well-formed Google Maps URL', async () => {
        const res = await request(app)
            .post('/api/export-googlemaps')
            .send({
                waypoints: [waypoint1, waypoint2]
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('url');
        expect(res.body.url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1/);
        expect(res.body.url).toContain('origin=0,0');
        expect(res.body.url).toContain('destination=0,1');
        expect(res.body.url).toContain('travelmode=driving');
    });
});
