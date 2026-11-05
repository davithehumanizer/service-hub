/**
 * One spare part as the PartsFinder API actually answered on 2026-08-20.
 *
 * Captured rather than invented: the mapper exists because the API shape and
 * the search index shape disagree, and a hand-written fixture would encode
 * what I assumed the API returns instead of what it does.
 *
 * mediaObjects was adjusted by hand afterwards: the capture predates the
 * normalizer emitting the same object shape as the search index. Worth
 * re-capturing on the next deploy to put it back on solid ground.
 */
export const partsFinderSparePart = {
  "@context": "/contexts/SparePart",
  "@id": "/spare_parts/01a0158a-24a8-7d30-895d-aa5365383d7b",
  "@type": "SparePart",
  "id": "01a0158a-24a8-7d30-895d-aa5365383d7b",
  "model": {
    "@id": "/spare_part_models/01a0158a-24a8-74e4-895d-aa53646598e4",
    "@type": "SparePartModel",
    "id": "01a0158a-24a8-74e4-895d-aa53646598e4",
    "brand": {
      "@id": "/brands/01a00fb0-c5f6-7dce-ba3f-ca580c6055c9",
      "@type": "Brand",
      "id": "01a00fb0-c5f6-7dce-ba3f-ca580c6055c9",
      "slug": "brand-samsung",
      "name": "Samsung",
      "status": {
        "@type": "Type",
        "@id": "/.well-known/genid/1c4e36cabaa3bd6a5215",
        "id": "01a00fb0-bfe2-73c0-9dbb-f84621212b2c",
        "slug": "brand-status-active"
      }
    },
    "type": {
      "@id": "/spare_part_types/01a00fb0-c9d9-7137-895e-237e4eba4dd7",
      "@type": "SparePartType",
      "id": "01a00fb0-c9d9-7137-895e-237e4eba4dd7",
      "category": "/spare_part_categories/01a00fb0-c86f-7d30-ac86-744b8b19c762",
      "slug": "spare-part-type-tv-led-backlight-strip",
      "name": "TV LED Backlight Strip",
      "description": "LED backlight bar for edge-lit or direct-lit LCD televisions."
    },
    "object3DModels": [],
    "slug": "spare-part-model-led-backlight-strip",
    "name": "LED backlight strip"
  },
  "repairer": {
    "@type": "Repairer",
    "@id": "/.well-known/genid/58129b2d6ca5e7febe3c",
    "id": "01a00fb0-d368-75dd-a54f-b9745698a18e",
    "deliveryMethods": [],
    "slug": "repairer-operator-org",
    "name": "Repairer Operator Org",
    "addresses": []
  },
  "device": "/devices/01a0158a-248d-7c27-b1b6-663c7c056183",
  "prices": [
    {
      "@type": "Price",
      "@id": "/.well-known/genid/6d6e86a4e327a96efb59",
      "offerStatus": "active",
      "productPricingTarget": "both",
      "currency": "eur",
      "unitAmount": "19.90",
      "taxDisplayMode": "Included"
    }
  ],
  "internalNumber": "DEMO-SP-007",
  "status": {
    "@type": "Type",
    "@id": "/.well-known/genid/8b0c8a37f21f2834619a",
    "id": "01a00fb0-bfea-70a2-a838-b715d46b96c1",
    "slug": "spare-part-status-new"
  },
  "active": true,
  "mediaObjects": [
    {
      "url": "https://data.spareparts.care2repair.eu/media/01a01a79-3623-7694-a00f-979fb9bef3f7",
      "mimeType": "image/jpeg",
      "originalFilename": "41ICkyGh8BL._AC_UF1000,1000_QL80_"
    }
  ]
};
