/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react$: require.resolve('react'),
      'react-dom$': require.resolve('react-dom'),
    };
    return config;
  },
};
