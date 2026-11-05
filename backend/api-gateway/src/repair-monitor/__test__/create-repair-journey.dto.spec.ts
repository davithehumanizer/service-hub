import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRepairJourneyDto } from '../dto/create-repair-journey.dto';

const severityErrors = async (issueSeverity: string) => {
  const dto = plainToInstance(CreateRepairJourneyDto, { issueSeverity });
  const errors = await validate(dto);
  return errors.filter((e) => e.property === 'issueSeverity');
};

describe('CreateRepairJourneyDto issueSeverity', () => {
  // The wizard answers "does the device still work?" with all three; a value
  // missing here makes the journey's creation answer 400.
  it.each(['working', 'partial', 'broken'])('accepts %s', async (value) => {
    expect(await severityErrors(value)).toHaveLength(0);
  });

  it('rejects a value the wizard never sends', async () => {
    expect(await severityErrors('fine')).toHaveLength(1);
  });
});
