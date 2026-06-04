jest.mock('../src/bootstrap/db', () => ({
  getPool: jest.fn()
}));

const { getPool } = require('../src/bootstrap/db');
const { withTransaction } = require('../src/utils/transaction');

function createConnection() {
  return {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
}

describe('withTransaction', () => {
  test('commits successful work and releases the connection', async () => {
    const connection = createConnection();
    getPool.mockReturnValue({
      getConnection: jest.fn().mockResolvedValue(connection)
    });

    const result = await withTransaction(async (conn) => {
      expect(conn).toBe(connection);
      return 'done';
    });

    expect(result).toBe('done');
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('rolls back failed work and releases the connection', async () => {
    const connection = createConnection();
    getPool.mockReturnValue({
      getConnection: jest.fn().mockResolvedValue(connection)
    });

    await expect(
      withTransaction(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
