import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Ownership } from './ownership.entity';

/**
 * Service pour la gestion des ownerships (appartenance d'appareils à des utilisateurs).
 */
@Injectable()
export class OwnershipService {
  constructor(
    @InjectRepository(Ownership)
    private readonly ownershipRepo: Repository<Ownership>,
  ) {}

  /**
   * Récupère les appareils d'un utilisateur.
   * @param userId L'identifiant de l'utilisateur.
   * @param requesterId L'identifiant du demandeur.
   * @param isAdmin Si le demandeur est admin.
   * @returns Liste des ownerships.
   */
  async getUserDevices(
    userId: number,
    requesterId: number,
    isAdmin: boolean,
  ): Promise<Ownership[]> {
    if (userId !== requesterId && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    // What the v1 routes understand: one row per catalogue device. A
    // personal device without a variant, or a second of the same variant,
    // is listed by /api/v2/personal-devices only.
    const owned = await this.ownershipRepo.find({
      where: { userId, deviceId: Not(IsNull()) },
    });
    const seen = new Set<number | null>();
    return owned.filter((o) => {
      if (seen.has(o.deviceId)) return false;
      seen.add(o.deviceId);
      return true;
    });
  }

  /**
   * Associe un appareil à un utilisateur.
   * @param deviceId L'identifiant de l'appareil.
   * @param userId L'identifiant de l'utilisateur.
   * @param acquiredAt Date d'acquisition.
   * @param requesterId L'identifiant du demandeur.
   * @param isAdmin Si le demandeur est admin.
   * @param modelId Le modèle de l'appareil, quand la passerelle le connaît.
   * @returns L'ownership créée.
   */
  async assignDeviceToUser(
    deviceId: number,
    userId: number,
    acquiredAt: Date,
    requesterId: number,
    isAdmin: boolean,
    modelId: number | null = null,
  ): Promise<Ownership> {
    if (userId !== requesterId && !isAdmin) {
      throw new ForbiddenException('Cannot assign to another user');
    }

    const alreadyExists = await this.ownershipRepo.findOneBy({
      userId,
      deviceId,
    });
    if (alreadyExists) return alreadyExists;

    const ownership = this.ownershipRepo.create({
      userId,
      deviceId,
      modelId,
      acquiredAt,
    });
    return this.ownershipRepo.save(ownership);
  }

  /**
   * Retire un appareil d'un utilisateur.
   * @param deviceId L'identifiant de l'appareil.
   * @param requesterId L'identifiant du demandeur.
   * @param isAdmin Si le demandeur est admin.
   * @returns Rien.
   */
  async removeDeviceFromUser(
    deviceId: number,
    requesterId: number,
    isAdmin: boolean,
  ): Promise<Ownership> {
    const record = await this.ownershipRepo.findOne({
      where: { deviceId, userId: requesterId },
    });

    if (!record || (record.userId !== requesterId && !isAdmin)) {
      throw new ForbiddenException('Not authorized to remove');
    }

    return this.ownershipRepo.remove(record);
  }
}
