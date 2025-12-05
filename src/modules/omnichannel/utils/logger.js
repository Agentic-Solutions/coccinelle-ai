/**
 * Logger spécifique au module Omnichannel
 */

const LOG_PREFIX = '[OMNICHANNEL]';

export const omniLogger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      module: 'omnichannel',
      message,
      ...data
    }));
  },

  error: (message, data = {}) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      module: 'omnichannel',
      message,
      ...data
    }));
  },

  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      module: 'omnichannel',
      message,
      ...data
    }));
  },

  debug: (message, data = {}) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      module: 'omnichannel',
      message,
      ...data
    }));
  }
};

export default omniLogger;
