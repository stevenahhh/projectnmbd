import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin 을 번들링하지 않고 런타임에 네이티브 require 로 로드한다.
  // admin 내부(jwks-rsa → jose)가 ESM-only 라 Turbopack 번들 경로에서
  // ERR_REQUIRE_ESM 으로 서버리스 콜드스타트가 죽는다.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
