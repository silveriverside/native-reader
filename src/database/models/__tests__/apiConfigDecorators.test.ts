import ApiConfig from '../ApiConfig';

describe('ApiConfig model decorators', () => {
  it('loads WatermelonDB decorated fields without runtime decorator errors', () => {
    expect(ApiConfig.table).toBe('api_configs');
  });
});
