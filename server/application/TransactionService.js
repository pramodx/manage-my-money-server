'use strict';

module.exports = {
    createTransaction: createTransaction,
    updateTransaction: updateTransaction,
    getTransaction: getTransaction,
    getTransactions: getTransactions,
    getTransactionsByCategory: getTransactionsByCategory,
    deleteTransaction: deleteTransaction
};

var domain = require('../domain');
var knex = require('../infrastructure/orm').knex;
var Transaction = domain.Transaction;

/**
 * Creates a new transaction and inserts it in to the database.
 * @param {Object} transactionData - Full transaction data, excluding the id. For example:
 * {
 *     txn_date: new Date('2015-02-01T00:00Z'),
 *     payee: 'Chevron Gas Station',
 *     memo: 'Gas',
 *     amount: -30.00,
 *     transaction_id: 3,
 *     category_id: 1
 * }
 * @return {Promise} A promise that returns a full copy of the inserted transaction (including the id) on fulfillment.
 */
function createTransaction(transactionData) {
    return saveTransaction(transactionData);
}

/**
 * Updates an existing transaction.
 * @param {Object} transactionData - Full transaction data, including the id. For example:
 * {
 *     id: 1,
 *     txn_date: new Date('2015-02-01T00:00Z'),
 *     payee: 'Chevron Gas Station',
 *     memo: 'Gas',
 *     amount: -30.00,
 *     transaction_id: 3,
 *     category_id: 1
 * }
 * @return {Promise} A promise that returns a full copy of the updated transaction on fulfillment.
 */
function updateTransaction(transactionData) {
    return saveTransaction(transactionData);
}

/**
 * Inserts or updates a transaction depending on whether the transaction has an `id` or not.
 * @param {Object} transactionData - Full transaction data, except `id` is optional.
 * @return {Promise} A promise that returns a full copy of the transaction on fulfillment.
 */
function saveTransaction(transactionData) {
    var transaction = new Transaction(transactionData);
    return transaction.save();
}

/**
 * Gets an existing transaction.
 * @param {integer} id
 * @return {Promise} A promise that returns the desired transaction on fulfillment.
 */
function getTransaction(id) {
    return new Transaction({id: id}).fetch({require: true})
        .then(function(transaction) {
            return transaction.load([
                'account',
                'category'
            ]);
        });
}

/**
 * Gets all transactions.
 * @param {number} [accountId] returns transactions only for the specified account
 * @return {Promise} A promise that returns an array of all transactions on fulfillment.
 */
function getTransactions(accountId) {

    var filterOptions = {};
    if (accountId) {
        filterOptions.account_id = accountId;
    }

    return Transaction
        .where(filterOptions)
        .fetchAll()
        .then(function(transactions) {
            return transactions.load([
                'account',
                'category'
            ]);
        });
}

/**
 * Gets transactions grouped by category. startDate and endDate can be specified to limit the range of
 * transactions aggregated (either both or neither should be specified).
 * @param {Date} [startDate] start date for filtering transactions
 * @param {Date} [endDate] end date for filtering transactions
 * @return {Promise} A promise that returns an array of aggregated transactions on fulfillment.
 * [
 *     { cat_id: 1, cat_name: 'Auto & Transport', amount: -1000.00 },
 *     { cat_id: 2, cat_name: 'Bills & Utilities', amount: -2000.00 },
 *     ...
 *     { cat_id: 8, cat_name: 'Salary', amount: 40000.00 },
 *     ...
 * ]
 */
function getTransactionsByCategory(startDate, endDate) {

    // Start a query builder
    var qb = knex
        .select(
            'c.id as cat_id',
            'c.name as cat_name',
            knex.raw('sum(t.amount) as amount'))
        .from('transactions as t')
        .leftOuterJoin('categories as c', 't.category_id', 'c.id');

    // Add optional start and end dates
    if (startDate && endDate) {
        qb = qb.whereBetween('t.txn_date', [startDate, endDate]);
    }

    // Finally add the groupBy clause
    qb = qb.groupBy('c.id');

    return qb;
}

/**
 * Deletes a transaction.
 * @param {integer} id
 * @return {Promise} A promise that gets fulfilled when the transaction is deleted.
 */
function deleteTransaction(id) {
    return new Transaction({id: id}).destroy();
}
