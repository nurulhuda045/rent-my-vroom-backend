import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns a healthy status payload', () => {
    const controller = new AppController();

    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
