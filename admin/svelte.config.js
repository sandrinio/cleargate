import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    csrf: {
      trustedOrigins: process.env['CLEARGATE_ADMIN_ORIGIN']
        ? [process.env['CLEARGATE_ADMIN_ORIGIN']]
        : [],
    },
  },
};

export default config;
