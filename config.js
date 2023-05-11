'use strict';

module.exports = {
  ATHOM_API_CLIENT_ID: process.env.ATHOM_API_CLIENT_ID ?? '5bd33e9b9c99fc4f8d0bc231',
  ATHOM_API_CLIENT_SECRET: process.env.ATHOM_API_CLIENT_SECRET ?? '2f1cf5ad5917eac06284c9b3071406c6db318274',
  ATHOM_API_LOGIN_URL: process.env.ATHOM_API_LOGIN_URL ?? 'https://cli.athom.com',
  ATHOM_CLI_MESSAGE_URL: process.env.ATHOM_CLI_MESSAGE_URL ?? 'https://go.athom.com/cli-message',
};
