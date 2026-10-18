/** @type {import('next').NextConfig} */
const nextConfig = {
    // Google Maps の APIキー（7.51節）。NEXT_PUBLIC_ で始まらない変数はブラウザ側に渡らないため、ここで渡す。
    // ビルド時に埋め込まれるので、値を変えたら再ビルド（開発サーバーなら再起動）が必要
    env: {
        GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
    },
};

export default nextConfig;
