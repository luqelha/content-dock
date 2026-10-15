import { BadRequestException } from '@nestjs/common';
import { LoginDto } from '../../../src/modules/auth/dto/login.dto';
import { createApplicationValidationPipe } from '../../../src/common/pipes/application-validation.pipe';

describe('Validation after Nest dependency upgrade', () => {
  const pipe = createApplicationValidationPipe();
  const metadata = { type: 'body' as const, metatype: LoginDto };

  it('still transforms to the DTO and removes undeclared properties', async () => {
    const result = await pipe.transform(
      { email: 'test@example.com', password: 'test-password', role: 'ADMIN' },
      metadata,
    );
    expect(result).toBeInstanceOf(LoginDto);
    expect(result.email).toBe('test@example.com');
    expect(result).not.toHaveProperty('role');
  });

  it.each([
    { email: 'invalid', password: 'test-password' },
    { email: 'test@example.com' },
    { email: 'test@example.com', password: 12345 },
  ])('still rejects invalid login input %j', async (input) => {
    await expect(pipe.transform(input, metadata)).rejects.toBeInstanceOf(BadRequestException);
  });
});
