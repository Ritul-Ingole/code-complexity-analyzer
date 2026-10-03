/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/history",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
