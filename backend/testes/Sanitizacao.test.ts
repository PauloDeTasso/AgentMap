import { sanitizeValue, sanitizeToolArguments, getErrorType } from '../src/observability/sanitization';

describe('sanitizeValue', () => {
  test('mantem string sem segredos', () => {
    expect(sanitizeValue('hello world')).toBe('hello world');
  });

  test('redacta campo apiKey', () => {
    expect(sanitizeValue('minha apiKey: 12345')).toBe('[REDACTED]');
  });

  test('redacta campo password', () => {
    expect(sanitizeValue('password secreta')).toBe('[REDACTED]');
  });

  test('redacta campo token', () => {
    expect(sanitizeValue('token abcdef')).toBe('[REDACTED]');
  });

  test('redacta campo secret', () => {
    expect(sanitizeValue('chave_secret: valor')).toBe('[REDACTED]');
  });

  test('redacta campo authorization', () => {
    expect(sanitizeValue('Authorization: Bearer xyz')).toBe('[REDACTED]');
  });

  test('redacta campo credential', () => {
    expect(sanitizeValue('credential value')).toBe('[REDACTED]');
  });

  test('redacta campo private_key', () => {
    expect(sanitizeValue('private_key content')).toBe('[REDACTED]');
  });

  test('redacta campo bearer', () => {
    expect(sanitizeValue('bearer token123')).toBe('[REDACTED]');
  });

  test('mantem null e undefined', () => {
    expect(sanitizeValue(null)).toBeNull();
    expect(sanitizeValue(undefined)).toBeUndefined();
  });

  test('mantem numeros', () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(3.14)).toBe(3.14);
  });

  test('mantem booleanos', () => {
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(false)).toBe(false);
  });

  test('redacta objeto com chave secreta', () => {
    const result = sanitizeValue({ username: 'admin', password: '123' });
    expect(result).toEqual({ username: 'admin', password: '[REDACTED]' });
  });

  test('redacta objeto aninhado', () => {
    const result = sanitizeValue({
      user: { name: 'test', apiKey: 'secret' },
      config: { token: 'xyz' }
    });
    expect(result).toEqual({
      user: { name: 'test', apiKey: '[REDACTED]' },
      config: { token: '[REDACTED]' }
    });
  });

  test('redacta arrays com valores secretos', () => {
    const result = sanitizeValue(['public', 'password=abc', 'normal']);
    expect(result).toEqual(['public', '[REDACTED]', 'normal']);
  });

  test('redacta arrays com objetos', () => {
    const result = sanitizeValue([
      { key: 'public' },
      { password: 'secret' },
      { api_key: 'key123' }
    ]);
    expect(result).toEqual([
      { key: 'public' },
      { password: '[REDACTED]' },
      { api_key: '[REDACTED]' }
    ]);
  });

  test('nao modifica objetos sem campos secretos', () => {
    const input = { nome: 'teste', valor: 123, ativo: true };
    const result = sanitizeValue(input);
    expect(result).toEqual(input);
  });

  test('case-insensitive para padroes de segredo', () => {
    expect(sanitizeValue('APIKEY abc')).toBe('[REDACTED]');
    expect(sanitizeValue('PASSWORD xyz')).toBe('[REDACTED]');
    expect(sanitizeValue('TOKEN 123')).toBe('[REDACTED]');
    expect(sanitizeValue('SECRET abc')).toBe('[REDACTED]');
    expect(sanitizeValue('AUTHORIZATION header')).toBe('[REDACTED]');
    expect(sanitizeValue('CREDENTIAL user')).toBe('[REDACTED]');
    expect(sanitizeValue('PRIVATE-KEY content')).toBe('[REDACTED]');
    expect(sanitizeValue('BEARER token')).toBe('[REDACTED]');
  });
});

describe('sanitizeToolArguments', () => {
  test('e alias para sanitizeValue', () => {
    expect(sanitizeToolArguments('password: abc')).toBe('[REDACTED]');
    expect(sanitizeToolArguments({ apiKey: 'xyz' })).toEqual({ apiKey: '[REDACTED]' });
  });
});

describe('getErrorType', () => {
  test('retorna nome da classe para Error', () => {
    expect(getErrorType(new Error('err'))).toBe('Error');
  });

  test('retorna nome para TypeError', () => {
    expect(getErrorType(new TypeError('tipo'))).toBe('TypeError');
  });

  test('retorna nome para SyntaxError', () => {
    expect(getErrorType(new SyntaxError('sintaxe'))).toBe('SyntaxError');
  });

  test('retorna nome da classe para objeto simples', () => {
    const obj = { message: 'custom' };
    expect(getErrorType(obj)).toBe('Object');
  });

  test('retorna "Unknown" para null', () => {
    expect(getErrorType(null)).toBe('Unknown');
  });

  test('retorna "Unknown" para undefined', () => {
    expect(getErrorType(undefined)).toBe('Unknown');
  });

  test('retorna nome de classe customizada', () => {
    class MyError extends Error {}
    expect(getErrorType(new MyError('custom'))).toBe('MyError');
  });
});
