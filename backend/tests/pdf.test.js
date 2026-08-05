const { EventEmitter } = require('events');
const { sendPdf } = require('../src/utils/pdf');

function response({ fail = false } = {}) {
  const res = new EventEmitter();
  res.destroyed = false;
  res.writableEnded = false;
  res.writableFinished = false;
  res.setHeader = jest.fn();
  res.end = jest.fn(() => {
    res.writableEnded = true;
    if (fail) {
      res.emit('error', new Error('connection lost'));
      return;
    }
    res.writableFinished = true;
    res.emit('finish');
  });
  return res;
}

describe('PDF response delivery', () => {
  test('resolves only after the response finishes', async () => {
    const res = response();
    await expect(sendPdf(res, 'test.pdf', (doc) => doc.text('delivered'))).resolves.toBeInstanceOf(Buffer);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('rejects a broken response before document completion can be recorded', async () => {
    const res = response({ fail: true });
    await expect(sendPdf(res, 'test.pdf', (doc) => doc.text('broken'))).rejects.toThrow('connection lost');
  });
});
