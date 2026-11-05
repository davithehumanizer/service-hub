import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ModelIndexService } from '../../device-models/model-index.service';

/**
 * Writes every device model to the device_models search index, creating it
 * with its mapping if missing, then removes the documents of models deleted
 * since. Run after models:assign, which changes models in bulk.
 */
@Injectable()
export class SyncModelsCommand {
  constructor(private readonly modelIndex: ModelIndexService) {}

  @Command({
    command: 'search:sync-models',
    describe: 'Write every device model to the device_models search index',
  })
  async sync() {
    const started = Date.now();
    const { indexed, refused, removed } = await this.modelIndex.syncAll((n) => {
      if (n % 50000 === 0) console.log(`  ${n} models…`);
    });
    console.log(
      `Models indexed: ${indexed}, refused: ${refused}, removed: ${removed}`,
    );
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    // The CLI exits with 1: a deployment must not pass over a partial index.
    if (refused > 0) throw new Error(`${refused} models refused`);
  }
}
