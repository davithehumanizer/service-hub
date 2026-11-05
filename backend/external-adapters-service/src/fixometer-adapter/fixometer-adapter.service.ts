import { Injectable, Logger } from "@nestjs/common";
import {
  CATEGORY_TO_REFERENCE,
  DISPLACEMENT_RATE,
  NO_REFERENCE_DATA,
  REFERENCE_FACTORS,
} from "./reference-factors";

/**
 * An average combustion car, manufacturing included, in grams of CO2e per
 * kilometre: ADEME, Impact CO2, "voiture thermique" (2025 model) —
 * https://impactco2.fr/outils/transport/voiturethermique. A life-cycle CO2e
 * figure, like the repair's. The trees equivalent went with the unsourced
 * 120 g/km: estimates of what a tree absorbs run from 10 to 25 kg a year.
 */
const CO2E_PER_CAR_KM_G = 142;

export interface ImpactMetrics {
  /** CO2e avoided by the repair, in kg. */
  co2: number;
  equivalents: {
    carKm: number;
  };
  /** Where the figure comes from, so callers can judge how much to trust it. */
  reference: {
    category: string;
    /** How many real products the category average rests on. */
    products: number;
  };
}

/**
 * The CO2e a repair avoids, from The Restart Project's reference data.
 *
 * Replaces a `weight x constant` formula whose own authors had marked its
 * constants "Placeholder". That formula was not mis-calibrated but wrong in
 * kind: embodied carbon does not track mass, so it understated a mobile phone
 * almost eightfold while overstating a fan elevenfold.
 *
 * Water was dropped with it. Its only input was an invented 50 L/kg, and the
 * reference data carries no water figure to replace it — so the honest number
 * of litres to display is none.
 */
@Injectable()
export class FixometerAdapterService {
  private readonly logger = new Logger(FixometerAdapterService.name);

  /**
   * @returns null when the category has no reference factor. That is a real
   *   answer — "we do not know" — and callers must not render it as zero.
   */
  fetchImpactMetrics(deviceCategory: string): ImpactMetrics | null {
    const referenceCategory = CATEGORY_TO_REFERENCE[deviceCategory];

    if (!referenceCategory) {
      const reason = NO_REFERENCE_DATA[deviceCategory];
      this.logger.log(
        reason
          ? `No impact for "${deviceCategory}": ${reason}`
          : `No impact for "${deviceCategory}": category absent from the mapping`,
      );
      return null;
    }

    const factor = REFERENCE_FACTORS[referenceCategory];
    const co2 = factor.preUseCo2eKg * DISPLACEMENT_RATE;

    return {
      co2,
      equivalents: {
        carKm: (co2 * 1000) / CO2E_PER_CAR_KM_G,
      },
      reference: {
        category: referenceCategory,
        products: factor.products,
      },
    };
  }
}
