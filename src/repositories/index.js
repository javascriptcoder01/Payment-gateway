/**
 * ============================================================
 * REPOSITORY SELECTOR
 * ============================================================
 * This is the ONLY file that decides which database is active.
 * Everything else in the app (service/controller/routes) just
 * calls require('../repositories') and uses save/findByOrderId/
 * updateStatus/findAll — it never knows or cares which DB engine
 * is actually running underneath.
 *
 * Switch DB by changing ONE line in .env:
 *   DB_DRIVER=mongo      -> uses transaction.repository.mongo.js
 *   DB_DRIVER=mysql      -> uses transaction.repository.sql.js (mysql dialect)
 *   DB_DRIVER=postgres   -> uses transaction.repository.sql.js (postgres dialect)
 *   DB_DRIVER=memory     -> uses transaction.repository.memory.js (zero setup, for quick demo/testing)
 */

const driver = process.env.DB_DRIVER || 'memory';

let repository;

switch (driver) {
  case 'mongo':
    repository = require('./transaction.repository.mongo');
    break;
  case 'mysql':
  case 'postgres':
    repository = require('./transaction.repository.sql');
    break;
  case 'memory':
  default:
    repository = require('./transaction.repository.memory');
    break;
}

module.exports = repository;
