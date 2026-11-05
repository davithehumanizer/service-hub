import { Test, TestingModule } from "@nestjs/testing";
import { FixometerAdapterService } from "../fixometer-adapter.service";
import {
  CATEGORY_TO_REFERENCE,
  DISPLACEMENT_RATE,
  NO_REFERENCE_DATA,
  REFERENCE_FACTORS,
} from "../reference-factors";

describe("FixometerAdapterService", () => {
  let service: FixometerAdapterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FixometerAdapterService],
    }).compile();

    service = module.get<FixometerAdapterService>(FixometerAdapterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("applies the reference method: pre-use CO2e times the displacement rate", () => {
    const result = service.fetchImpactMetrics("Kettle");

    // Kettle: 44.32 kg pre-use CO2e in the reference data.
    expect(result?.co2).toBeCloseTo(44.32 * DISPLACEMENT_RATE, 5);
    expect(result?.reference.category).toBe("Kettle");
  });

  it("converts the CO2e into kilometres of an average combustion car, and nothing else", () => {
    const result = service.fetchImpactMetrics("Kettle");

    // ADEME Impact CO2: 142 g CO2e per km, manufacturing included.
    expect(result?.equivalents.carKm).toBeCloseTo((44.32 * DISPLACEMENT_RATE * 1000) / 142, 5);
    expect(Object.keys(result!.equivalents)).toEqual(["carKm"]);
  });

  // The old formula multiplied mass by a constant, which put a phone and a
  // fan of the same weight on the same footing. They are now an order of
  // magnitude apart, as embodied carbon actually is.
  it("separates devices that weigh the same but do not cost the same to make", () => {
    const phone = service.fetchImpactMetrics("Mobile phone / Cell phone");
    const lamp = service.fetchImpactMetrics("Table lamp");

    expect(phone).not.toBeNull();
    expect(lamp).not.toBeNull();
    expect(phone!.co2).toBeGreaterThan(lamp!.co2 * 3);
  });

  it("maps our finer categories onto the coarser reference ones", () => {
    // Ours has 349 categories, the reference 43; a beard trimmer is a
    // "Hair & Beauty item" there.
    const result = service.fetchImpactMetrics("Beard trimmer");

    expect(result?.reference.category).toBe("Hair & Beauty item");
  });

  // Returning zero would be read as "this repair avoids nothing", which is a
  // claim the data does not support.
  it("answers null, not zero, for a category with no reference figure", () => {
    expect(service.fetchImpactMetrics("Washing machine / Combi dryer")).toBeNull();
    expect(service.fetchImpactMetrics("Electric guitar")).toBeNull();
  });

  it("answers null for a category it has never heard of", () => {
    expect(service.fetchImpactMetrics("Flux capacitor")).toBeNull();
    expect(service.fetchImpactMetrics("")).toBeNull();
  });

  it("reports how thin the average is, so callers can weigh it", () => {
    // Sewing machine rests on a single product; laptops on 64.
    expect(service.fetchImpactMetrics("Sewing machine")?.reference.products).toBe(1);
    expect(service.fetchImpactMetrics("Laptop")?.reference.products).toBeGreaterThan(50);
  });

  describe("reference tables", () => {
    it("points every mapped category at a factor that exists", () => {
      const missing = Object.entries(CATEGORY_TO_REFERENCE)
        .filter(([, target]) => !(target in REFERENCE_FACTORS))
        .map(([source]) => source);

      expect(missing).toEqual([]);
    });

    it("never both maps and excludes the same category", () => {
      const both = Object.keys(CATEGORY_TO_REFERENCE).filter(
        (category) => category in NO_REFERENCE_DATA,
      );

      expect(both).toEqual([]);
    });

    it("carries no factor that nothing points at", () => {
      const targets = new Set(Object.values(CATEGORY_TO_REFERENCE));
      const orphans = Object.keys(REFERENCE_FACTORS).filter(
        (factor) => !targets.has(factor),
      );

      expect(orphans).toEqual([]);
    });
  });
});
