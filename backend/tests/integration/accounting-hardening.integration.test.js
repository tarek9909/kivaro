const {
  authRequest,
  closeIntegrationPool,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('accounting hardening integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) {
      token = await loginOwner();
    }
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('posted expenses can be edited and voided through auditable ledger adjustments', async () => {
    if (!dbReady) return;

    const categoryResponse = await authRequest(token)
      .post('/api/expense-categories')
      .send({ name: `Hardening Expenses ${Date.now()}` })
      .expect(201);
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Expense Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 100
      })
      .expect(201);

    const categoryId = categoryResponse.body.data.expense_category.id;
    const cashAccountId = cashAccountResponse.body.data.cash_account.id;

    await authRequest(token)
      .patch(`/api/expenses/1`)
      .send({ amount: -1 })
      .expect(400);

    const createResponse = await authRequest(token)
      .post('/api/expenses')
      .send({
        expense_category_id: categoryId,
        expense_date: '2026-05-28',
        amount: 10,
        payment_method: 'cash',
        cash_account_id: cashAccountId,
        description: 'Initial expense'
      })
      .expect(201);
    const expenseId = createResponse.body.data.expense.id;

    await authRequest(token)
      .patch(`/api/expenses/${expenseId}`)
      .send({
        amount: 4,
        cash_account_id: cashAccountId,
        description: 'Adjusted expense'
      })
      .expect(200);

    let [account] = await dbQuery(
      'SELECT current_balance FROM cash_accounts WHERE id = ?',
      [cashAccountId]
    );
    expect(Number(account.current_balance)).toBe(96);

    const transactionsAfterEdit = await dbQuery(
      'SELECT transaction_type, direction, amount FROM financial_transactions WHERE reference_type = ? AND reference_id = ? ORDER BY id ASC',
      ['expense', expenseId]
    );
    expect(transactionsAfterEdit.map((row) => [row.transaction_type, row.direction, Number(row.amount)])).toEqual([
      ['expense', 'out', 10],
      ['manual_adjustment', 'in', 10],
      ['expense', 'out', 4]
    ]);

    await authRequest(token)
      .delete(`/api/expenses/${expenseId}`)
      .expect(200);

    [account] = await dbQuery(
      'SELECT current_balance FROM cash_accounts WHERE id = ?',
      [cashAccountId]
    );
    expect(Number(account.current_balance)).toBe(100);

    const [expense] = await dbQuery(
      'SELECT status, voided_at FROM expenses WHERE id = ?',
      [expenseId]
    );
    expect(expense.status).toBe('voided');
    expect(expense.voided_at).not.toBeNull();
  });
});
