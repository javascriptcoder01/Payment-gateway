const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

app.listen(env.PORT, () => {
  logger.info(`🚀 Payment service running on http://localhost:${env.PORT}`);
  logger.info(`Mode: ${env.APP_MODE.toUpperCase()}`);
});
