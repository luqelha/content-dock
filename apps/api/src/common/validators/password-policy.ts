import { registerDecorator, ValidationOptions } from 'class-validator';

export const PASSWORD_HASH_COST = 12;

// bcrypt only consumes the first 72 UTF-8 bytes. Reject rather than truncate.
export function IsRegistrationPassword(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isRegistrationPassword',
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          Array.from(value).length >= 15 &&
          Buffer.byteLength(value, 'utf8') <= 72,
        defaultMessage: () =>
          'Password must contain at least 15 characters and at most 72 UTF-8 bytes.',
      },
    });
  };
}
